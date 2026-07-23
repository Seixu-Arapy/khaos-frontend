// Telegram Bot API helpers shared by the webhook (telegram-bot) and the
// scheduled notifier (telegram-notify).

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';

export const ALLOWED_CHAT_IDS: string[] = (
  Deno.env.get('TELEGRAM_ALLOWED_CHAT_IDS') ?? ''
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const ALLOWED_CHAT_ID_SET = new Set(ALLOWED_CHAT_IDS);

const TELEGRAM_MAX_CHARS = 4096;

export async function tg(
  method: string,
  payload: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error(`Telegram ${method} failed`, res.status, await res.text());
  }
}

// The in-app UI turns [[task:uuid]] tokens into cards; Telegram has no such
// renderer, so strip any the model emits (the system prompt already tells it
// not to, this is the fallback).
export function stripTokens(text: string): string {
  return text
    .replace(/\[\[(?:task|project|event):[^\]]+\]\]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function sendMessage(chatId: number, text: string): Promise<void> {
  const clean = stripTokens(text) || '(no response)';
  // Telegram caps a single message at 4096 chars; chunk longer answers.
  for (let i = 0; i < clean.length; i += TELEGRAM_MAX_CHARS) {
    await tg('sendMessage', {
      chat_id: chatId,
      text: clean.slice(i, i + TELEGRAM_MAX_CHARS),
      disable_web_page_preview: true,
    });
  }
}

export async function typing(chatId: number): Promise<void> {
  await tg('sendChatAction', { chat_id: chatId, action: 'typing' });
}
