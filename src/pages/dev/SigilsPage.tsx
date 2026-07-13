import { useState } from 'react';
import { Sparkles } from 'lucide-react';
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
      glyph={<Sparkles size={22} />}
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
