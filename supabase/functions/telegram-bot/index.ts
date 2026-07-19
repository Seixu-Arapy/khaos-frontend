// Telegram bot for Khaos.
//
// A Telegram webhook lands here. This function is the server-side twin of the
// in-app chat agent (src/lib/chat): same persona, same database tools, same
// tool loop — only the surface differs. The agent's pure pieces (persona
// prompts, schema search, tool schemas + executor) are imported straight from
// the app source, so the two can't drift; the browser-only glue (the Anthropic
// proxy, the React hook, write-confirmation UI) is replaced here by a direct
// Anthropic call and a service-role Supabase client.
//
// Deploy:
//   supabase functions deploy telegram-bot
// Configure secrets (ANTHROPIC_API_KEY is already set for anthropic-proxy):
//   supabase secrets set TELEGRAM_BOT_TOKEN=123456:ABC...
//   supabase secrets set TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32)
//   supabase secrets set TELEGRAM_ALLOWED_CHAT_IDS=<your numeric chat id>
// Register the webhook (secret must match TELEGRAM_WEBHOOK_SECRET):
//   curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
//     -d "url=https://<project-ref>.supabase.co/functions/v1/telegram-bot" \
//     -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
//
// verify_jwt is OFF for this function (see supabase/config.toml): Telegram
// can't present a Supabase JWT. Access is gated instead by the webhook secret
// header plus the chat-id allowlist below.

import Anthropic from '@anthropic-ai/sdk';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { SYSTEM_INSTRUCTION, TONE_INSTRUCTION } from '../../../src/lib/chat/prompts.ts';
import { searchSchema as searchSchemaCore } from '../../../src/lib/chat/schemaSearchCore.ts';
import {
  executeTool,
  normalizeToolName,
  TOOL_DEFINITIONS,
} from '../../../src/lib/chat/toolsCore.ts';
import { SCHEMA_SQL } from './schema.sql.ts';

const MODEL_NAME = Deno.env.get('LLM_MODEL') ?? 'claude-sonnet-5';
const TIMEZONE = Deno.env.get('TELEGRAM_TIMEZONE') ?? 'America/Sao_Paulo';

const MAX_TOOL_ROUNDS = 6;
const MAX_HISTORY_MESSAGES = 14; // window sent to the model per turn
const MAX_STORED_MESSAGES = 60; // window persisted between turns
const MAX_TOKENS = 4096;
const TELEGRAM_MAX_CHARS = 4096;

// Mirrors src/hooks/useChatAgent.ts. A brand-new chat opens with the persona's
// OPENING TURN behaviour instead of a canned greeting.
const BOOTSTRAP_INSTRUCTION =
  '[Session Bootstrap: This is the first turn of a new session — nobody has typed anything yet. Follow your OPENING TURN rules: a brief greeting is fine, but do not offer to help or ask an open-ended question — check current state for something worth surfacing before saying anything else.]';

// Telegram is plain text with no card renderer, so the [[task:uuid]] tokens the
// in-app UI turns into cards would just be noise here. This addendum tells the
// model to speak the details in words instead; stripTokens() below is the
// belt-and-braces fallback for any that slip through.
const CHANNEL_INSTRUCTION = `
TELEGRAM CHANNEL

You are responding over Telegram as plain text. There is no card renderer here.

Do NOT emit [[task:uuid]], [[project:uuid]] or [[event:uuid]] tokens. When you reference a task, project or event, state its relevant details (name, status, due date, time range) in plain words.

Keep formatting simple. Avoid Markdown tables and headings. Short paragraphs and plain hyphen bullets only.
`.trim();

// Byte-for-byte identical on every call so prompt caching hits — same
// discipline as src/lib/chat/agent.ts. Nothing dynamic goes in here; per-turn
// context rides in on the user message instead.
const SYSTEM_PROMPT_TEXT = `
<system_instructions>
${SYSTEM_INSTRUCTION}
</system_instructions>

<tone_and_behavior>
${TONE_INSTRUCTION}
</tone_and_behavior>

<channel>
${CHANNEL_INSTRUCTION}
</channel>
`.trim();

const SYSTEM_BLOCKS: Anthropic.TextBlockParam[] = [
  {
    type: 'text',
    text: SYSTEM_PROMPT_TEXT,
    cache_control: { type: 'ephemeral' },
  },
];

type ChatMessage = Anthropic.MessageParam;

// ---------------------------------------------------------------------------
// Environment / clients
// ---------------------------------------------------------------------------

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
const WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? '';
const ALLOWED_CHAT_IDS = new Set(
  (Deno.env.get('TELEGRAM_ALLOWED_CHAT_IDS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '',
});

const db: SupabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// The tool executor is host-agnostic — inject this project's service-role
// client and a schema search bound to the embedded schema.sql copy.
const toolDeps = {
  db,
  searchSchema: (query: string) => searchSchemaCore(SCHEMA_SQL, query),
};

// ---------------------------------------------------------------------------
// Telegram API
// ---------------------------------------------------------------------------

async function tg(method: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error(`Telegram ${method} failed`, res.status, await res.text());
  }
}

function stripTokens(text: string): string {
  return text
    .replace(/\[\[(?:task|project|event):[^\]]+\]\]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function sendMessage(chatId: number, text: string): Promise<void> {
  const clean = stripTokens(text) || '(no response)';
  // Telegram caps a single message at 4096 chars; split on paragraph
  // boundaries where possible so long answers arrive as readable chunks.
  for (let i = 0; i < clean.length; i += TELEGRAM_MAX_CHARS) {
    await tg('sendMessage', {
      chat_id: chatId,
      text: clean.slice(i, i + TELEGRAM_MAX_CHARS),
      disable_web_page_preview: true,
    });
  }
}

// ---------------------------------------------------------------------------
// History persistence (telegram_chats table, service-role only)
// ---------------------------------------------------------------------------

async function loadHistory(chatId: number): Promise<ChatMessage[]> {
  const { data, error } = await db
    .from('telegram_chats')
    .select('history')
    .eq('chat_id', chatId)
    .maybeSingle();
  if (error) {
    console.error('loadHistory failed', error.message);
    return [];
  }
  const history = (data?.history ?? []) as ChatMessage[];
  return Array.isArray(history) ? history : [];
}

async function saveHistory(chatId: number, history: ChatMessage[]): Promise<void> {
  const trimmed = history.slice(-MAX_STORED_MESSAGES);
  const { error } = await db.from('telegram_chats').upsert(
    { chat_id: chatId, history: trimmed, updated_at: new Date().toISOString() },
    { onConflict: 'chat_id' }
  );
  if (error) console.error('saveHistory failed', error.message);
}

async function clearHistory(chatId: number): Promise<void> {
  const { error } = await db.from('telegram_chats').upsert(
    { chat_id: chatId, history: [], updated_at: new Date().toISOString() },
    { onConflict: 'chat_id' }
  );
  if (error) console.error('clearHistory failed', error.message);
}

// ---------------------------------------------------------------------------
// Agent loop — server-side port of src/lib/chat/agent.ts runTurn.
//
// The one behavioural difference: there is no interactive write-confirmation
// step. This is a single-owner bot gated by the allowlist, so write tools
// execute directly (the persona already soft-deletes via deleted_at and records
// its rationale in the `reason` field, per the system prompt).
// ---------------------------------------------------------------------------

function isFreshUserTurn(message: ChatMessage): boolean {
  if (message.role !== 'user') return false;
  if (typeof message.content === 'string') return true;
  return !message.content.some((block) => block.type === 'tool_result');
}

function trimHistory(messages: ChatMessage[], max: number): ChatMessage[] {
  if (messages.length <= max) return messages;
  let sliceFrom = Math.max(0, messages.length - max);
  while (sliceFrom > 0 && !isFreshUserTurn(messages[sliceFrom])) sliceFrom--;
  return messages.slice(sliceFrom);
}

function extractText(content: ChatMessage['content']): string {
  if (typeof content === 'string') return content;
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

async function runTurn(history: ChatMessage[]): Promise<ChatMessage[]> {
  const messages = trimHistory(history, MAX_HISTORY_MESSAGES);
  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    let response: Anthropic.Message;
    try {
      response = await anthropic.messages.create({
        model: MODEL_NAME,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_BLOCKS,
        tools: TOOL_DEFINITIONS as Anthropic.Tool[],
        messages,
      });
    } catch (err) {
      messages.push({
        role: 'assistant',
        content:
          err instanceof Anthropic.RateLimitError
            ? "I'm being rate-limited right now. Give it a moment and try again."
            : "I couldn't complete that — something went wrong reaching the model.",
      });
      break;
    }

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'pause_turn') continue;

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );
    if (!toolUses.length) break;

    rounds++;

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUses) {
      let result: unknown;
      try {
        const toolName = normalizeToolName(toolUse.name);
        const args = toolUse.input as Record<string, unknown>;
        // No confirmation gate — write tools execute directly. See the block
        // comment above runTurn for why that's acceptable for this bot.
        result = await executeTool(toolDeps, toolName, args);
      } catch (err) {
        result = { error: (err as Error).message };
      }
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  return messages;
}

function temporalContext(): string {
  return `[Temporal Context: current_time is ${new Date().toISOString()}, timezone is ${TIMEZONE}]\n`;
}

async function runAgent(
  chatId: number,
  userContent: string
): Promise<string> {
  const history = await loadHistory(chatId);
  const withUser: ChatMessage[] = [
    ...history,
    { role: 'user', content: userContent },
  ];
  const updated = await runTurn(withUser);
  await saveHistory(chatId, updated);

  const last = updated[updated.length - 1];
  return last?.role === 'assistant' ? extractText(last.content) : '';
}

// ---------------------------------------------------------------------------
// Update handling
// ---------------------------------------------------------------------------

interface TgUpdate {
  message?: TgMessage;
  edited_message?: TgMessage;
}
interface TgMessage {
  text?: string;
  chat: { id: number };
}

async function handleUpdate(update: TgUpdate): Promise<void> {
  const message = update.message ?? update.edited_message;
  const text = message?.text?.trim();
  const chatId = message?.chat?.id;
  if (!chatId || !text) return;

  // Access control. An empty allowlist means the bot hasn't been claimed yet —
  // reply with the chat id so the owner can add it to TELEGRAM_ALLOWED_CHAT_IDS.
  if (ALLOWED_CHAT_IDS.size === 0) {
    await sendMessage(
      chatId,
      `This bot has no allowed chats configured. Add this chat id to TELEGRAM_ALLOWED_CHAT_IDS to enable it:\n${chatId}`
    );
    return;
  }
  if (!ALLOWED_CHAT_IDS.has(String(chatId))) {
    await sendMessage(chatId, `Not authorized. Your chat id is ${chatId}.`);
    return;
  }

  const command = text.startsWith('/') ? text.split(/\s+/)[0].toLowerCase() : null;

  if (command === '/start' || command === '/clear' || command === '/reset') {
    await clearHistory(chatId);
    await tg('sendChatAction', { chat_id: chatId, action: 'typing' });
    const opener = await runAgent(
      chatId,
      `${temporalContext()}${BOOTSTRAP_INSTRUCTION}`
    );
    await sendMessage(chatId, opener || 'Khaos online.');
    return;
  }

  if (command === '/whoami') {
    await sendMessage(chatId, `Chat id: ${chatId}`);
    return;
  }

  await tg('sendChatAction', { chat_id: chatId, action: 'typing' });
  try {
    const reply = await runAgent(chatId, `${temporalContext()}${text}`);
    await sendMessage(chatId, reply || 'Done.');
  } catch (err) {
    console.error('handleUpdate failed', err);
    await sendMessage(
      chatId,
      "Something went wrong on my side. Try again in a moment."
    );
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Telegram echoes back the secret set with setWebhook. Reject anything else
  // before touching the body — this is the function's trust boundary.
  const presented = req.headers.get('x-telegram-bot-api-secret-token') ?? '';
  if (!WEBHOOK_SECRET || presented !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  // Return 200 immediately so Telegram marks the update delivered and never
  // retries (which would double-process the message); the agent loop, which
  // can take several seconds across tool rounds, runs to completion in the
  // background.
  const work = handleUpdate(update).catch((err) =>
    console.error('background handleUpdate error', err)
  );
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } })
    .EdgeRuntime;
  if (runtime?.waitUntil) {
    runtime.waitUntil(work);
  } else {
    await work;
  }

  return new Response('ok', { status: 200 });
});
