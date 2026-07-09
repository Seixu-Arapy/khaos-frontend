import type OpenAI from 'openai';
import {
  client,
  MODEL_NAME,
  SYSTEM_INSTRUCTION,
  TONE_INSTRUCTION,
} from './client';
import {
  executeTool,
  normalizeToolName,
  WRITE_TOOLS,
  functionDeclarations,
} from './tools';

const MAX_TOOL_ROUNDS = 6;
const MAX_HISTORY_MESSAGES = 14;
const MAX_API_RETRIES = 3; // retries specifically for Groq's tool_use_failed generation errors

const formattedTools = functionDeclarations.map((fd) => ({
  type: 'function' as const,
  function: {
    name: fd.name,
    description: fd.description,
    parameters: fd.parametersJsonSchema,
  },
}));

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
  isError?: boolean;
}

interface RunTurnOptions {
  onPendingWrite: (
    name: string,
    args: Record<string, unknown>
  ) => Promise<boolean>;
}

function trimHistory(
  messages: ChatMessage[],
  maxMessages: number
): ChatMessage[] {
  if (messages.length <= maxMessages) return messages;
  const systemPrompt = messages[0]?.role === 'system' ? messages[0] : null;
  const rest = systemPrompt ? messages.slice(1) : messages;
  let sliceFrom = Math.max(0, rest.length - maxMessages);
  while (sliceFrom > 0 && rest[sliceFrom].role === 'tool') sliceFrom--;
  const trimmed = rest.slice(sliceFrom);
  return systemPrompt ? [systemPrompt, ...trimmed] : trimmed;
}

// Groq's tool-use models occasionally fail to produce a function call that
// passes Groq's own validation. This surfaces as a 400 with
// code "tool_use_failed" / message "Failed to call a function…". It's a
// generation-time failure on Groq's side.
function isToolUseFailedError(err: any): boolean {
  const code = err?.error?.code || err?.code;
  const message = err?.error?.message || err?.message || '';
  return (
    code === 'tool_use_failed' || /Failed to call a function/i.test(message)
  );
}

// Strips every tool-related artifact from the history: assistant
// `tool_calls`, and `tool`-role messages entirely (folded into a short
// system-visible note instead of being dropped silently). Groq appears to
// still choke on tool_use_failed even when `tools` is omitted from the
// request if earlier messages reference tool calls — so a genuine
// tools-less fallback has to scrub the history, not just the request
// params.
function stripToolArtifacts(messages: any[]): any[] {
  const cleaned: any[] = [];
  for (const m of messages) {
    if (m.role === 'tool') continue; // drop raw tool results
    if (m.role === 'assistant' && m.tool_calls?.length) {
      // Keep the message only if it also has real text content; otherwise
      // it was purely a tool-call carrier and contributes nothing once
      // tool_calls is stripped.
      if (m.content) cleaned.push({ role: 'assistant', content: m.content });
      continue;
    }
    cleaned.push({ role: m.role, content: m.content ?? '' });
  }
  return cleaned;
}

async function completeWithRetry(
  sanitizedMessages: any[],
  { allowTools, retries }: { allowTools: boolean; retries: number }
) {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await client.chat.completions.create({
        model: MODEL_NAME,
        messages: sanitizedMessages,
        ...(allowTools
          ? { tools: formattedTools, tool_choice: 'auto' as const }
          : {}),
      });
    } catch (err) {
      lastErr = err;
      if (!isToolUseFailedError(err) || attempt === retries) throw err;
      await new Promise((r) =>
        setTimeout(r, 300 * (attempt + 1) + Math.random() * 200)
      );
    }
  }
  throw lastErr;
}

interface FallbackTier {
  allowTools: boolean;
  retries: number;
  scrub: boolean;
}

// Ordered from best (tools enabled, most retries) to worst (tools disabled,
// history scrubbed of every tool artifact) — see isToolUseFailedError for
// why Groq needs a ladder here instead of a single retry policy.
const FALLBACK_TIERS: FallbackTier[] = [
  { allowTools: true, retries: MAX_API_RETRIES, scrub: false },
  { allowTools: false, retries: 1, scrub: false },
  { allowTools: false, retries: 1, scrub: true },
];

// Works through FALLBACK_TIERS in order, degrading the request each time
// Groq rejects it with tool_use_failed. Returns null once every tier is
// exhausted; any other kind of error propagates immediately.
async function completeWithFallback(sanitizedMessages: any[]) {
  for (const tier of FALLBACK_TIERS) {
    const messages = tier.scrub
      ? stripToolArtifacts(sanitizedMessages)
      : sanitizedMessages;
    try {
      const response = await completeWithRetry(messages, tier);
      return { response, degraded: tier.scrub };
    } catch (err) {
      if (!isToolUseFailedError(err)) throw err;
    }
  }
  return null;
}

export async function runTurn(
  history: ChatMessage[],
  { onPendingWrite }: RunTurnOptions
): Promise<{ updatedHistory: ChatMessage[]; text: string }> {
  let currentMessages = [...history];

  if (currentMessages.length === 0 || currentMessages[0].role !== 'system') {
    const combinedSystemPrompt = `
<system_instructions>
${SYSTEM_INSTRUCTION}
</system_instructions>

<tone_and_behavior>
${TONE_INSTRUCTION}
</tone_and_behavior>
    `.trim();
    currentMessages.unshift({ role: 'system', content: combinedSystemPrompt });
  }

  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    currentMessages = trimHistory(currentMessages, MAX_HISTORY_MESSAGES);

    const sanitizedMessages = currentMessages.map((m) => {
      const cleaned: any = { role: m.role, content: m.content ?? null };
      if (m.tool_calls) {
        cleaned.tool_calls = m.tool_calls.map((tc: any) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.function.name,
            arguments:
              typeof tc.function.arguments === 'string'
                ? tc.function.arguments
                : JSON.stringify(tc.function.arguments),
          },
        }));
      }
      if (m.tool_call_id) cleaned.tool_call_id = m.tool_call_id;
      if (m.name) cleaned.name = m.name;
      return cleaned;
    });

    const fallback = await completeWithFallback(sanitizedMessages);
    if (!fallback) {
      // Every tier failed — give up gracefully rather than throwing a raw
      // API error up into the UI. Falls through to the shared return below.
      currentMessages.push({
        role: 'assistant',
        content:
          "I couldn't complete that — the request tripped up the model's tool-calling step. Try rephrasing, or splitting it into smaller steps.",
        isError: true,
      });
      break;
    }

    const { response, degraded } = fallback;
    const assistantMessage = response.choices[0].message;
    currentMessages.push({
      role: 'assistant',
      content: assistantMessage.content ?? null,
      tool_calls: assistantMessage.tool_calls,
    });

    // A degraded (scrubbed, tools-less) completion never carries
    // tool_calls — stop here rather than trying to process any.
    if (degraded) break;

    if (assistantMessage.tool_calls?.length) {
      rounds++;
      // Only function tools are declared (see formattedTools above); Groq
      // never returns the custom-tool variant, but the SDK types the field
      // as a union of both.
      const toolCalls = assistantMessage.tool_calls.filter(
        (tc): tc is OpenAI.ChatCompletionMessageFunctionToolCall =>
          tc.type === 'function'
      );
      for (const tc of toolCalls) {
        let args: Record<string, unknown>;
        try {
          args =
            typeof tc.function.arguments === 'string'
              ? JSON.parse(tc.function.arguments)
              : tc.function.arguments;
        } catch (parseErr) {
          currentMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            name: tc.function.name,
            content: JSON.stringify({
              error: `Could not parse arguments for "${tc.function.name}": ${(parseErr as Error).message}`,
            }),
          });
          continue;
        }

        let result: unknown;
        try {
          // Normalize aliased/mis-cased tool names (e.g. the model calling
          // "update_row" instead of the declared "update_rows") before the
          // write-confirmation check — otherwise an aliased write tool
          // would skip user confirmation and execute straight away.
          const toolName = normalizeToolName(tc.function.name);
          if (WRITE_TOOLS.has(toolName)) {
            const approved = await onPendingWrite(toolName, args);
            result = approved
              ? await executeTool(toolName, args)
              : {
                  declined: true,
                  message: 'The person chose not to run this action.',
                };
          } else {
            result = await executeTool(toolName, args);
          }
        } catch (err) {
          result = { error: (err as Error).message };
        }

        currentMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.function.name,
          content: JSON.stringify(result),
        });
      }
    } else {
      break;
    }
  }

  const lastMessage = currentMessages[currentMessages.length - 1];
  return {
    updatedHistory: currentMessages,
    text: lastMessage.role === 'assistant' ? lastMessage.content || '' : '',
  };
}
