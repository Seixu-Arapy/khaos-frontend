// Scheduled oversight agent for Khaos.
//
// Watches every `moments` row — not just chat-driven changes, everything the
// entity triggers already log (tasks, sections, projects, routines) — and
// periodically narrates batches worth surfacing. Output is read-only for the
// interactive agent via the recall_oversight_notes tool (see
// src/lib/chat/toolsCore.ts); there is deliberately no separate UI for it.
//
// Invoked by cron (pg_cron / Supabase Cron), same mechanism as
// telegram-notify, and authenticates the same way: the X-Khaos-Cron-Secret
// header against KHAOS_CRON_SECRET — already set for telegram-notify, no new
// secret needed here.
//
// verify_jwt is OFF (see supabase/config.toml): cron can't present a Supabase
// JWT, so the header above is the trust boundary instead.
//
// Deploy:
//   supabase functions deploy oversight-agent
// Configure (KHAOS_CRON_SECRET is already set if telegram-notify is deployed;
// this is the only other setting, and it's optional):
//   supabase secrets set OVERSIGHT_LLM_MODEL=claude-haiku-4-5   # this is the default
//
// One-time manual cron wiring (SQL editor — mirrors
// supabase/functions/telegram-bot/README.md's pattern; skip the two
// `create extension` lines if telegram-notify's cron setup already ran them):
//
//   create extension if not exists pg_cron;
//   create extension if not exists pg_net;
//
//   select cron.schedule('oversight-agent-tick', '*/15 * * * *', $$
//     select net.http_post(
//       url     := 'https://<project-ref>.supabase.co/functions/v1/oversight-agent',
//       headers := jsonb_build_object(
//                    'Content-Type', 'application/json',
//                    'X-Khaos-Cron-Secret', '<KHAOS_CRON_SECRET>'),
//       body    := '{}'::jsonb
//     );
//   $$);

import Anthropic from '@anthropic-ai/sdk';
import { db } from '../_shared/khaos.ts';

const CRON_SECRET = Deno.env.get('KHAOS_CRON_SECRET') ?? '';
const MODEL_NAME = Deno.env.get('OVERSIGHT_LLM_MODEL') ?? 'claude-haiku-4-5';

// Bounds worst-case cost/runtime on a catch-up run (e.g. after downtime)
// rather than trying to process an unbounded backlog in one invocation — the
// cursor only advances to what was actually processed, so the rest is picked
// up on the next tick.
const MAX_MOMENTS_PER_RUN = 500;

// A cluster of just one moment only qualifies for analysis if its type is
// inherently worth a look on its own; everything else needs company (a
// single due-date nudge is noise, three in a week might be a pattern).
const MIN_CLUSTER_SIZE = 2;
const NOTEWORTHY_ALONE = new Set(['note', 'priority', 'status']);

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '',
});

const ENTITY_COLUMNS = [
  'project_id',
  'section_id',
  'task_id',
  'routine_id',
] as const;
type EntityColumn = (typeof ENTITY_COLUMNS)[number];

const ENTITY_TABLE: Record<EntityColumn, string> = {
  project_id: 'projects',
  section_id: 'sections',
  task_id: 'tasks',
  routine_id: 'routines',
};

interface MomentRow {
  id: string;
  project_id: string | null;
  section_id: string | null;
  task_id: string | null;
  routine_id: string | null;
  moment_type: string;
  value: string | null;
  previous_value: string | null;
  moment_note: string | null;
  created_at: string;
}

interface EntityRef {
  table: string;
  id: string;
}

// chk_single_entity guarantees exactly one of these is set per row.
function entityRef(m: MomentRow): EntityRef | null {
  for (const col of ENTITY_COLUMNS) {
    const id = m[col];
    if (id) return { table: ENTITY_TABLE[col], id };
  }
  return null;
}

function clusterKey(ref: EntityRef): string {
  return `${ref.table}:${ref.id}`;
}

const SEVERITIES = ['low', 'medium', 'high'] as const;
type Severity = (typeof SEVERITIES)[number];

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    noteworthy: {
      type: 'boolean',
      description:
        'Whether this cluster of changes forms a pattern worth surfacing later. Most clusters are not — a single ordinary edit, a routine estimate tweak, or expected progress is not noteworthy on its own.',
    },
    summary: {
      type: 'string',
      description:
        "One or two plain sentences describing the pattern, in Khaos's own voice: calm, observant, concise, no enthusiasm, no exclamation. Only meaningful when noteworthy is true.",
    },
    severity: {
      type: 'string',
      enum: SEVERITIES,
      description: 'How much this is worth surfacing. Only meaningful when noteworthy is true.',
    },
  },
  required: ['noteworthy'],
  additionalProperties: false,
};

interface ClusterVerdict {
  summary: string;
  severity: Severity;
}

async function analyzeCluster(moments: MomentRow[]): Promise<ClusterVerdict | null> {
  const lines = moments
    .map((m) => {
      const change = `${m.previous_value ?? '(none)'} -> ${m.value ?? '(none)'}`;
      const note = m.moment_note ? ` (note: ${m.moment_note})` : '';
      return `- ${m.moment_type}: ${change}${note} [${m.created_at}]`;
    })
    .join('\n');

  const prompt = `You're reviewing a batch of database change-log entries ("moments") for a single entity, oldest first, to decide whether they form a pattern worth mentioning later — not to describe each one individually.\n\n${lines}`;

  const response = await anthropic.messages.create({
    model: MODEL_NAME,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: { type: 'json_schema', schema: REPORT_SCHEMA } },
  });

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === 'text'
  );
  if (!textBlock) return null;

  let parsed: { noteworthy?: boolean; summary?: string; severity?: string };
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    return null;
  }
  if (!parsed.noteworthy || !parsed.summary) return null;

  const severity = SEVERITIES.includes(parsed.severity as Severity)
    ? (parsed.severity as Severity)
    : 'low';
  return { summary: parsed.summary, severity };
}

async function runOnce(): Promise<{ processed: number; notes: number }> {
  const { data: cursorRow, error: cursorReadError } = await db
    .from('oversight_cursor')
    .select('last_processed_at')
    .eq('id', true)
    .maybeSingle();
  if (cursorReadError) {
    throw new Error(`cursor read failed: ${cursorReadError.message}`);
  }
  const since = cursorRow?.last_processed_at ?? '1970-01-01T00:00:00Z';

  const { data, error } = await db
    .from('moments')
    .select(
      'id,project_id,section_id,task_id,routine_id,moment_type,value,previous_value,moment_note,created_at'
    )
    .gt('created_at', since)
    .order('created_at', { ascending: true })
    .limit(MAX_MOMENTS_PER_RUN);
  if (error) throw new Error(`moments query failed: ${error.message}`);

  const moments = (data ?? []) as MomentRow[];
  if (!moments.length) return { processed: 0, notes: 0 };

  const clusters = new Map<string, MomentRow[]>();
  for (const m of moments) {
    const ref = entityRef(m);
    if (!ref) continue; // shouldn't happen — chk_single_entity guarantees one FK
    const key = clusterKey(ref);
    const group = clusters.get(key) ?? [];
    group.push(m);
    clusters.set(key, group);
  }

  let notesWritten = 0;
  let anyFailure = false;

  for (const group of clusters.values()) {
    const qualifies =
      group.length >= MIN_CLUSTER_SIZE ||
      group.some((m) => NOTEWORTHY_ALONE.has(m.moment_type));
    if (!qualifies) continue;

    let verdict: ClusterVerdict | null;
    try {
      verdict = await analyzeCluster(group);
    } catch (err) {
      console.error('analyzeCluster failed', err);
      anyFailure = true;
      continue;
    }
    if (!verdict) continue;

    const ref = entityRef(group[0])!;
    const { error: insertError } = await db.from('oversight_notes').insert({
      summary: verdict.summary,
      entity_refs: [ref],
      severity: verdict.severity,
      window_start: group[0].created_at,
      window_end: group[group.length - 1].created_at,
    });
    if (insertError) {
      console.error('oversight_notes insert failed', insertError.message);
      anyFailure = true;
      continue;
    }
    notesWritten++;

    // Only fills moment_note where it's still null — never overwrites a note
    // a person or the live interactive agent already gave. The extra
    // `.is('moment_note', null)` on the update is belt-and-braces against a
    // race with one of those arriving between our read and this write.
    const idsNeedingNote = group.filter((m) => !m.moment_note).map((m) => m.id);
    if (idsNeedingNote.length) {
      const { error: updateError } = await db
        .from('moments')
        .update({ moment_note: verdict.summary, authored_by: 'ai_backfill' })
        .in('id', idsNeedingNote)
        .is('moment_note', null);
      if (updateError) {
        console.error('moment_note backfill failed', updateError.message);
        anyFailure = true;
      }
    }
  }

  // Only advance past what this run actually finished cleanly. A failure
  // leaves the cursor where it was, so the next tick reprocesses the whole
  // batch rather than silently skipping the failed part — a redundant
  // oversight_notes row or two on retry is cheap; losing a batch isn't.
  if (!anyFailure) {
    const maxCreatedAt = moments[moments.length - 1].created_at;
    const { error: cursorWriteError } = await db
      .from('oversight_cursor')
      .update({ last_processed_at: maxCreatedAt })
      .eq('id', true);
    if (cursorWriteError) {
      throw new Error(`cursor advance failed: ${cursorWriteError.message}`);
    }
  }

  return { processed: moments.length, notes: notesWritten };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const presented = req.headers.get('x-khaos-cron-secret') ?? '';
  if (!CRON_SECRET || presented !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Return 200 immediately; the actual work finishes in the background so
  // the cron caller isn't held open — same pattern as telegram-notify.
  const work = runOnce()
    .then((result) => console.warn('oversight-agent run', result))
    .catch((err) => console.error('oversight-agent run failed', err));

  const runtime = (
    globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }
  ).EdgeRuntime;
  if (runtime?.waitUntil) {
    runtime.waitUntil(work);
  } else {
    await work;
  }

  return new Response('ok', { status: 200 });
});
