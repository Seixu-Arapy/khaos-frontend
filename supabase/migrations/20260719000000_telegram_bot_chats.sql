-- Conversation memory for the Telegram bot Edge Function (supabase/functions/
-- telegram-bot). One row per Telegram chat, holding the running message history
-- in Anthropic's own wire format (text / tool_use / tool_result blocks), the
-- same shape the in-app agent persists to localStorage.
--
-- Written and read only by the Edge Function, which authenticates with the
-- service-role key and so bypasses RLS. RLS is enabled with no policies, which
-- denies every anon/authenticated request — the browser app has no business
-- reading these transcripts.

create table if not exists "public"."telegram_chats" (
    "chat_id" bigint primary key,
    "history" jsonb not null default '[]'::jsonb,
    "updated_at" timestamptz not null default now()
);

comment on table "public"."telegram_chats" is
    'Per-chat conversation history for the Telegram bot Edge Function. Written only by that function via the service-role key.';

alter table "public"."telegram_chats" enable row level security;
