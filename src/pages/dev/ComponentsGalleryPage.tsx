import { useState, type ReactNode } from 'react';
import { Bug } from 'lucide-react';
import {
  Button,
  IconButton,
  Select,
  TextInput,
  Modal,
  Tag,
  StatusBadge,
  PriorityBadge,
  StatusPicker,
  PriorityPicker,
  EmptyState,
  DueBadge,
  TargetBadge,
  FieldBadge,
  ProjectChip,
  TaskProgressBar,
} from '../../components/common/ui';
import { ChangeBadge } from '../../components/assistant/ChangeBadge';
import { STATUSES, PRIORITIES } from '../../lib/constants';
import { FIELDS_CONFIG } from '../../lib/fieldsConfig';
import type { Status, Priority } from '../../lib/types';

// Live gallery of the app's real shared components — every swatch below
// imports and renders the actual component, driven by the actual token
// maps (STATUS_META, PRIORITY_META, FIELDS_CONFIG), so this page can never
// silently drift from what's really in common/ui.tsx. Dev-only, not linked
// from AppShell nav; reached directly at /dev/components.

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-ink-700 mb-8 rounded-lg border p-5">
      <h2 className="text-ink-200 font-display mb-4 text-sm tracking-wide uppercase">
        {title}
      </h2>
      <div className="flex flex-wrap items-center gap-4">{children}</div>
    </section>
  );
}

function Swatch({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className="text-ink-500 font-mono text-[10px] uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

const SAMPLE_CHANGES = [
  { field: 'status' as const, label: 'Status', from: 'todo', to: 'in_progress' },
  { field: 'priority' as const, label: 'Priority', from: 'medium', to: 'urgent' },
  { field: 'due' as const, label: 'Due', from: null, to: '2026-07-20' },
  { field: 'estimate' as const, label: 'Estimate', from: null, to: '120' },
];

export default function ComponentsGalleryPage() {
  const [status, setStatus] = useState<Status>('in_progress');
  const [priority, setPriority] = useState<Priority>('medium');
  const [modalOpen, setModalOpen] = useState(false);
  const [text, setText] = useState('');
  const fieldNames = Object.keys(FIELDS_CONFIG);
  const sampleField = fieldNames[0];

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center gap-2">
        <Bug size={18} className="text-copper-400" />
        <h1 className="text-ink-100 font-display text-xl">Component Gallery</h1>
      </div>

      <Section title="Buttons">
        <Swatch label="default">
          <Button>Save</Button>
        </Swatch>
        <Swatch label="secondary">
          <Button variant="secondary">Cancel</Button>
        </Swatch>
        <Swatch label="ghost">
          <Button variant="ghost">Dismiss</Button>
        </Swatch>
        <Swatch label="danger">
          <Button variant="danger">Delete</Button>
        </Swatch>
        <Swatch label="sm">
          <Button size="sm">Small</Button>
        </Swatch>
        <Swatch label="icon button">
          <IconButton label="Close">
            <Bug size={16} />
          </IconButton>
        </Swatch>
      </Section>

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

      <Section title="Inputs">
        <Swatch label="text input">
          <TextInput
            placeholder="Type something…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </Swatch>
        <Swatch label="select">
          <Select defaultValue="b">
            <option value="a">Option A</option>
            <option value="b">Option B</option>
          </Select>
        </Swatch>
      </Section>

      <Section title="Overlays &amp; states">
        <Swatch label="modal">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Example modal"
            footer={<Button onClick={() => setModalOpen(false)}>Done</Button>}
          >
            Real Modal component, rendered with real props.
          </Modal>
        </Swatch>
        <Swatch label="empty state">
          <EmptyState
            icon={Bug}
            title="Nothing here yet"
            hint="This is the shared EmptyState component."
          />
        </Swatch>
      </Section>
    </div>
  );
}
