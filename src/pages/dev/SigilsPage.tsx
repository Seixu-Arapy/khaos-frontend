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
          <span className="text-eros-400 font-semibold">Calls you to act</span>{' '}
          — planning, todo, in progress share Eros, heat rising with
          proximity (600 → 500 → 400).
        </p>
        <p className="text-nyx-400 mb-1.5">
          <span className="text-pontus-400 font-semibold">Waiting, soft</span>{' '}
          — in review is Pontus: someone else is still moving.
        </p>
        <p className="text-nyx-400 mb-1.5">
          <span className="text-hypnos-400 font-semibold">Waiting, softer</span>{' '}
          — waiting-on-previous is Hypnos: asleep until its turn.
        </p>
        <p className="text-nyx-400 mb-1.5">
          <span className="text-nyx-300 font-semibold">Waiting, hard</span> —
          paused is Nyx 500: a stop you chose, drained of color.
        </p>
        <p className="text-nyx-400">
          <span className="text-gaia-500 font-semibold">Closed, well</span> —
          done is Gaia.{' '}
          <span className="text-nyx-600 font-semibold">Closed, dead</span> —
          cancelled is the deepest Nyx, <em>more</em> muted than paused —
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
        <Swatch label="project chip">
          <ProjectChip name="Roadmap Q3" fieldName={sampleField} />
        </Swatch>
      </Section>

      <Section title="Dates &amp; progress">
        <Swatch label="due (upcoming)">
          <DueBadge due="2026-08-01" status="todo" />
        </Swatch>
        <Swatch label="due (overdue)">
          <DueBadge due="2026-01-01" status="todo" />
        </Swatch>
        <Swatch label="target range">
          <TargetBadge target='["2026-07-01 00:00:00+00","2026-07-15 00:00:00+00")' />
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
    </Chamber>
  );
}
