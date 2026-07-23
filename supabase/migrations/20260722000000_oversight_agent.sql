-- Schema for the oversight agent (supabase/functions/oversight-agent): a
-- scheduled Edge Function that watches every moments row — not just the ones
-- chat-driven changes produce — and periodically narrates batches of them for
-- the interactive agent to recall later (via the recall_oversight_notes tool).
--
-- Extending an existing table's constraint, plus two new ones:

-- ai_backfill is a 4th authored_by value, for notes the oversight agent infers
-- after the fact from a diff. Kept distinct from assistant (a live, stated
-- reason from the interactive agent) so an inference is never confused with
-- something someone actually said — see the column comment below.
alter table "public"."moments" drop constraint "chk_moments_authored_by";
alter table "public"."moments" add constraint "chk_moments_authored_by"
    check (authored_by = any (array['user'::text, 'system'::text, 'assistant'::text, 'ai_backfill'::text]));

comment on column "public"."moments"."authored_by" is
    'Who supplied moment_note: user (typed by a person), system (app-generated boilerplate, e.g. a skipped note prompt), assistant (written directly by the LLM), or ai_backfill (inferred after the fact by the oversight agent from a diff, only when moment_note was still null).';

-- Singleton watermark: the latest moments.created_at the oversight agent has
-- already considered. Moments are append-only (never updated after insert),
-- so one global cursor is simpler and cheaper than a per-row processed flag —
-- batch processing here is inherently serial (one job, one cursor) anyway.
--
-- Written and read only by the oversight-agent Edge Function (service-role
-- key). RLS on, no policy — same as telegram_chats/telegram_notifications,
-- there's no legitimate browser use case for this internal cursor.
create table if not exists "public"."oversight_cursor" (
    "id" boolean primary key default true,
    "last_processed_at" timestamptz not null default '1970-01-01T00:00:00Z',
    constraint "chk_oversight_cursor_singleton" check (id)
);
insert into "public"."oversight_cursor" (id) values (true) on conflict do nothing;
alter table "public"."oversight_cursor" enable row level security;

comment on table "public"."oversight_cursor" is
    'Singleton watermark for the scheduled oversight-agent Edge Function: the latest moments.created_at it has already considered.';

-- Ephemeral, LLM-inferred commentary on batches of moments — "a comment on
-- what just happened, not a persisted interpretation." Read-only for the
-- interactive chat agent via recall_oversight_notes; RLS follows this app's
-- dominant convention (enabled + a blanket allow-all policy, like every other
-- user-data table) rather than the telegram_* exception, since this table
-- does have a legitimate browser-side reader.
create table if not exists "public"."oversight_notes" (
    "id" uuid primary key default gen_random_uuid(),
    "summary" text not null,
    "entity_refs" jsonb not null default '[]'::jsonb,
    "severity" text not null default 'low' check (severity in ('low', 'medium', 'high')),
    "window_start" timestamptz not null,
    "window_end" timestamptz not null,
    "created_at" timestamptz not null default now()
);
alter table "public"."oversight_notes" enable row level security;
create policy "allow all" on "public"."oversight_notes" using (true) with check (true);

comment on table "public"."oversight_notes" is
    'Ephemeral, LLM-inferred commentary on batches of moments, produced by the scheduled oversight-agent Edge Function. Read via the recall_oversight_notes chat tool. An inference, not a source of truth.';
comment on column "public"."oversight_notes"."entity_refs" is
    'Entities the summary is about, e.g. [{"table": "tasks", "id": "<uuid>"}, ...]. A batch can span more than one entity, unlike a single moment.';
comment on column "public"."oversight_notes"."severity" is
    'How much this is worth surfacing: low, medium, or high.';
