# Telegram bot for Khaos

A Telegram front end for the Khaos chat agent. Message the bot and you get the
same intelligence as the in-app assistant — same persona, same database tools,
same conversational memory — driven server-side by a Supabase Edge Function.

## How it works

The function is the server-side twin of `src/lib/chat`. It imports the agent's
pure pieces directly from the app source so the two can never drift:

| Shared module (`src/lib/chat`) | What the bot reuses it for |
| --- | --- |
| `prompts.ts` | The Khaos persona (`SYSTEM_INSTRUCTION`, `TONE_INSTRUCTION`) |
| `schemaSearchCore.ts` | The `search_schema` tool over an embedded `schema.sql` |
| `toolsCore.ts` | Tool schemas, argument coercion, and the executor |

The browser-only glue is swapped out: instead of the `anthropic-proxy`
function it calls Anthropic directly with `ANTHROPIC_API_KEY`, and instead of
the anon-key client with interactive write-confirmation it uses a **service-role**
Supabase client and executes write tools without a confirmation step (a
single-owner bot behind an allowlist — the persona still soft-deletes and
records its rationale). Per-chat history lives in the `telegram_chats` table.

`schema.sql.ts` is a generated, embedded copy of the repo's `schema.sql`
(Deno has no Vite `?raw` import). Regenerate it whenever the schema changes:

```bash
npm run gen:edge-schema   # runs automatically as part of `npm run db:dump`
```

## Setup

1. **Create the bot** with [@BotFather](https://t.me/BotFather) and copy the token.

2. **Apply the migration** that adds the history table:

   ```bash
   npm run db:push
   ```

3. **Set the function secrets** (`ANTHROPIC_API_KEY` is already set for
   `anthropic-proxy`; you only need the Telegram ones):

   ```bash
   supabase secrets set TELEGRAM_BOT_TOKEN=123456:ABC...
   supabase secrets set TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32)
   # Leave the allowlist empty for now — the bot will reply with your chat id.
   ```

4. **Deploy:**

   ```bash
   supabase functions deploy telegram-bot
   ```

5. **Register the webhook** (the `secret_token` must equal `TELEGRAM_WEBHOOK_SECRET`):

   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=https://<project-ref>.supabase.co/functions/v1/telegram-bot" \
     -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
   ```

6. **Claim the bot.** Message it once. With an empty allowlist it replies with
   your numeric chat id. Add it and redeploy (or just update the secret):

   ```bash
   supabase secrets set TELEGRAM_ALLOWED_CHAT_IDS=<your chat id>
   ```

   Multiple ids are comma-separated.

## Commands

| Command | Effect |
| --- | --- |
| `/start`, `/clear`, `/reset` | Wipe this chat's history and open a fresh session |
| `/whoami` | Reply with your chat id |
| anything else | A turn with the agent |

## Access control & security

- **Webhook secret** — every request must carry the `X-Telegram-Bot-Api-Secret-Token`
  header matching `TELEGRAM_WEBHOOK_SECRET`, checked before the body is read.
  `verify_jwt` is off for this function (Telegram can't present a Supabase JWT).
- **Allowlist** — only chat ids in `TELEGRAM_ALLOWED_CHAT_IDS` reach the agent.
  An empty allowlist denies everyone and just echoes the caller's chat id.
- **Service-role key** stays server-side. The `telegram_chats` table has RLS on
  with no policies, so nothing but the service role can read the transcripts.

## Optional secrets

| Secret | Default | Purpose |
| --- | --- | --- |
| `LLM_MODEL` | `claude-sonnet-5` | Model the bot uses |
| `TELEGRAM_TIMEZONE` | `America/Sao_Paulo` | IANA tz for the temporal context prefix |
