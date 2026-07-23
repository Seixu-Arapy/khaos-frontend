import { useState } from 'react';
import { Chamber, Section, Swatch } from './vaultUI';
import {
  StatusBadge,
  PriorityBadge,
  StatusPicker,
  PriorityPicker,
  FieldBadge,
  ProjectChip,
  DueBadge,
  TargetBadge,
  ScheduledBadge,
  TaskProgressBar,
  Tag,
} from '../../components/common/ui';
import { ChangeBadge } from '../../components/assistant/ChangeBadge';
import { STATUSES, PRIORITIES } from '../../lib/constants';
import { FIELDS_CONFIG } from '../../lib/fieldsConfig';
import type { Status, Priority } from '../../lib/types';

const SAMPLE_CHANGES = [
  { field: 'status' as const, label: 'Status', from: 'todo', to: 'in_progress' },
  { field: 'priority' as const, label: 'Priority', from: 'medium', to: 'urgent' },
  { field: 'due' as const, label: 'Due', from: null, to: '2026-07-20' },
  { field: 'estimate' as const, label: 'Estimate', from: null, to: '120' },
];

export default function SigilsPage() {
  const [status, setStatus] = useState<Status>('in_progress');
  const [priority, setPriority] = useState<Priority>('medium');
  const fieldNames = Object.keys(FIELDS_CONFIG);
  const sampleField = fieldNames[0];

  return (
    <Chamber
      index="V"
      name="The Sigils"
      tagline="Status, priority, fields, dates, tags — marks that carry meaning"
    >
      <div className="mb-10">
        <h2 className="font-serif text-nyx-100 mb-3 text-2xl">
          Part I — The Entities
        </h2>
        <p className="text-nyx-400 mb-8 max-w-prose text-caption leading-relaxed">
          The real rows saved in tables (<code className="text-eros-400">
            fields
          </code>
          , <code className="text-eros-400">projects</code>,{' '}
          <code className="text-eros-400">sections</code>,{' '}
          <code className="text-eros-400">tasks</code>, and the rest), each
          with its own identity — not just a value pulled from a fixed
          vocabulary (that&rsquo;s Part II, below).
        </p>
        <p className="text-nyx-400 mb-8 max-w-prose text-caption leading-relaxed">
          <b className="text-nyx-200">Chip vs. badge, where it matters:</b> a{' '}
          <b>chip</b> stands in for a specific saved record — it has an
          identity, so it can be clicked through to that record or removed
          from where it&rsquo;s attached (<code className="text-eros-400">
            ProjectChip
          </code>
          , <code className="text-eros-400">Tag</code>). A <b>badge</b> just
          renders one field&rsquo;s current value — no identity of its own
          beyond that value, nothing to click through to (
          <code className="text-eros-400">StatusBadge</code>,{' '}
          <code className="text-eros-400">FieldBadge</code>). Field is the
          one entity styled as a badge rather than a chip — it reads as a
          tag-shaped label on other things (a project&rsquo;s field, a
          task&rsquo;s field) more often than as a thing in its own right,
          so it kept the badge shape it already had rather than being
          forced into a chip.
        </p>

        <Section title="Entities with a chip or badge">
          <Swatch label="project — chip">
            <ProjectChip name="Roadmap Q3" fieldName={sampleField} />
          </Swatch>
          <Swatch label="tag (work_tags) — chip">
            <Tag onRemove={() => {}}>design</Tag>
          </Swatch>
          <Swatch label="field — badge">
            <FieldBadge fieldName={sampleField} size="sm" />
          </Swatch>
        </Section>

        <p className="text-nyx-400 mb-3 mt-2 max-w-prose text-caption leading-relaxed">
          <b className="text-nyx-200">
            Entities that still don&rsquo;t have a defined chip or badge
          </b>{' '}
          of their own — shown elsewhere today, but not as a compact,
          reusable mark:
        </p>
        <Section title="Entities without one yet">
          <Swatch label="task">
            <span className="text-nyx-600 border-nyx-700 rounded border border-dashed px-2 py-1 text-caption italic">
              full row only (TaskRow) / rich card in chat
            </span>
          </Swatch>
          <Swatch label="section">
            <span className="text-nyx-600 border-nyx-700 rounded border border-dashed px-2 py-1 text-caption italic">
              header row only (SectionColumn)
            </span>
          </Swatch>
          <Swatch label="event">
            <span className="text-nyx-600 border-nyx-700 rounded border border-dashed px-2 py-1 text-caption italic">
              rich card in chat only (InlineEventPreview)
            </span>
          </Swatch>
          <Swatch label="task log (time entry)">
            <span className="text-nyx-600 border-nyx-700 rounded border border-dashed px-2 py-1 text-caption italic">
              folded into TaskProgressBar, no own mark
            </span>
          </Swatch>
          <Swatch label="routine">
            <span className="text-nyx-600 border-nyx-700 rounded border border-dashed px-2 py-1 text-caption italic">
              list row only (RoutinesPage)
            </span>
          </Swatch>
          <Swatch label="task item (checklist item)">
            <span className="text-nyx-600 border-nyx-700 rounded border border-dashed px-2 py-1 text-caption italic">
              checkbox + text row only
            </span>
          </Swatch>
        </Section>
      </div>

      <div className="border-nyx-700 mb-10 border-t pt-10">
        <h2 className="font-serif text-nyx-100 mb-3 text-2xl">
          Part II — The Dominions
        </h2>
        <p className="text-nyx-400 mb-8 max-w-prose text-caption leading-relaxed">
          Every deity claims dominion over one field&rsquo;s values — Eros
          rules the calls-to-act statuses, Tartarus rules urgency, Gaia
          rules what&rsquo;s finished well. Not things with their own
          identity (that&rsquo;s Part I, above) — just the current value of
          one column, pulled from a fixed vocabulary.
        </p>

        <Section title="Status">
          {STATUSES.map((s) => (
            <Swatch key={s} label={s}>
              <StatusBadge status={s} />
            </Swatch>
          ))}
          <Swatch label="picker">
            <StatusPicker value={status} onChange={setStatus} />
          </Swatch>
        </Section>

        <div className="border-nyx-700 mb-10 max-w-prose border-t pt-6 text-caption leading-relaxed">
          <p className="text-nyx-200 mb-3 font-semibold tracking-wide uppercase">
            How status color reads
          </p>
          <p className="text-nyx-300 mb-3">
            Grouped by what each status asks of <em>you</em>, not by a flat
            per-status color — the dot answers &ldquo;does this need
            me?&rdquo; before the label does.
          </p>
          <p className="text-nyx-400 mb-1.5">
            <span className="text-eros-400 font-semibold">
              Calls you to act
            </span>{' '}
            — planning, todo, in progress share Eros, heat rising with
            proximity (600 → 500 → 400).
          </p>
          <p className="text-nyx-400 mb-1.5">
            <span className="text-pontus-400 font-semibold">
              Waiting, soft
            </span>{' '}
            — in review is Pontus: someone else is still moving.
          </p>
          <p className="text-nyx-400 mb-1.5">
            <span className="text-hypnos-400 font-semibold">
              Waiting, softer
            </span>{' '}
            — waiting-on-previous is Hypnos: asleep until its turn.
          </p>
          <p className="text-nyx-400 mb-1.5">
            <span className="text-nyx-300 font-semibold">Waiting, hard</span>{' '}
            — paused is Nyx 500: a stop you chose, drained of color.
          </p>
          <p className="text-nyx-400">
            <span className="text-gaia-500 font-semibold">Closed, well</span>{' '}
            — done is Gaia.{' '}
            <span className="text-nyx-600 font-semibold">Closed, dead</span>{' '}
            — cancelled is the deepest Nyx, <em>more</em> muted than paused —
            it&rsquo;s not dangerous, it&rsquo;s just gone. Tartarus/danger
            stays reserved for things still actively going wrong.
          </p>
        </div>

        <Section title="Priority">
          {PRIORITIES.map((p) => (
            <Swatch key={p} label={p}>
              <PriorityBadge priority={p} />
            </Swatch>
          ))}
          <Swatch label="picker">
            <PriorityPicker value={priority} onChange={setPriority} />
          </Swatch>
        </Section>

        <Section title="Fields">
          {fieldNames.slice(0, 6).map((name) => (
            <Swatch key={name} label={name}>
              <div className="flex items-center gap-2">
                <FieldBadge fieldName={name} size="xs" />
                <FieldBadge fieldName={name} size="sm" />
                <FieldBadge fieldName={name} size="md" />
              </div>
            </Swatch>
          ))}
        </Section>

        <Section title="Dates, estimate &amp; progress">
          <Swatch label="due (upcoming)">
            <DueBadge due="2026-08-01" status="todo" />
          </Swatch>
          <Swatch label="due (overdue)">
            <DueBadge due="2026-01-01" status="todo" />
          </Swatch>
          <Swatch label="target range">
            <TargetBadge target='["2026-07-01 00:00:00+00","2026-07-15 00:00:00+00")' />
          </Swatch>
          <Swatch label="scheduled">
            {/* Added to TaskRow in the recent redesign -- a small marker
                for "already has a calendar event", not a full badge. */}
            <ScheduledBadge scheduled />
          </Swatch>
          <Swatch label="progress (compact)">
            <TaskProgressBar
              progress={{ loggedMinutes: 90, estimateMinutes: 120, pct: 75, level: 'ok' }}
            />
          </Swatch>
          <Swatch label="progress (over)">
            <TaskProgressBar
              progress={{ loggedMinutes: 150, estimateMinutes: 120, pct: 125, level: 'over' }}
            />
          </Swatch>
        </Section>

        <Section title="Tags &amp; change badges">
          <Swatch label="tag">
            <Tag onRemove={() => {}}>design</Tag>
          </Swatch>
          {SAMPLE_CHANGES.map((c) => (
            <Swatch key={c.field} label={c.field}>
              <ChangeBadge change={c} />
            </Swatch>
          ))}
        </Section>

        <p className="text-nyx-500 max-w-prose text-caption leading-relaxed">
          <b className="text-nyx-300">Not yet a mark of its own:</b> sequence
          (previous/next task dependency, currently a bespoke{' '}
          <code className="text-eros-400">SequenceChip</code> local to
          TaskDetailModal after the sequencing redesign) and moments/notes
          (an entity list, not a single value — closer to Part I&rsquo;s
          territory than a column badge).
        </p>
      </div>
    </Chamber>
  );
}
