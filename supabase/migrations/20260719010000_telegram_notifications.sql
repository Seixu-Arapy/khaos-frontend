-- Idempotency ledger for the scheduled notifier (supabase/functions/
-- telegram-notify). One row per notification actually delivered, so overlapping
-- or retried cron fires never double-send:
--   kind = 'digest'    ref = local date (YYYY-MM-DD)  → one morning digest/day
--   kind = 'reminder'  ref = event id                 → one reminder per event
--
-- Written only by the Edge Function via the service-role key. RLS on, no
-- policies, so nothing but the service role can read it.

create table if not exists "public"."telegram_notifications" (
    "chat_id" bigint not null,
    "kind" text not null,
    "ref" text not null,
    "sent_at" timestamptz not null default now(),
    primary key ("chat_id", "kind", "ref")
);

comment on table "public"."telegram_notifications" is
    'Idempotency ledger for the Telegram scheduled notifier (digest + reminders). Written only by that function via the service-role key.';

alter table "public"."telegram_notifications" enable row level security;
