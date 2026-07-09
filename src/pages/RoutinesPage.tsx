import { useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, CheckCircle } from 'lucide-react';
import { useRoutines, useRoutineMutations } from '../hooks/useRoutines';
import { useFields } from '../hooks/useHierarchy';
import {
  Modal,
  Button,
  TextInput,
  Select,
  EmptyState,
} from '../components/common/ui';
import type { NewRoutine, RoutineWithField } from '../lib/types';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Every day' },
  { value: 'every_2_days', label: 'Every 2 days' },
  { value: '2x_week', label: '2× per week' },
  { value: '3x_week', label: '3× per week' },
  { value: '4x_week', label: '4× per week' },
  { value: '5x_week', label: '5× per week' },
  { value: '1x_week', label: 'Once a week' },
  { value: '2x_month', label: 'Twice a month' },
  { value: '1x_month', label: 'Once a month' },
];

const TIME_OPTIONS = [
  { value: 'anytime', label: 'Any time' },
  { value: 'morning', label: 'Morning (06–12)' },
  { value: 'afternoon', label: 'Afternoon (12–18)' },
  { value: 'evening', label: 'Evening (18–21)' },
  { value: 'night', label: 'Night (21–23)' },
];

interface RoutineForm {
  name: string;
  frequency: string;
  preferred_time: string;
  estimate: string;
  constraints: string;
  field_id: string;
  active: boolean;
}

const EMPTY_FORM: RoutineForm = {
  name: '',
  frequency: '1x_week',
  preferred_time: 'anytime',
  estimate: '',
  constraints: '',
  field_id: '',
  active: true,
};

function formFromRoutine(routine: RoutineWithField): RoutineForm {
  return {
    name: routine.name,
    frequency: routine.frequency,
    preferred_time: routine.preferred_time ?? 'anytime',
    estimate: routine.estimate != null ? String(routine.estimate) : '',
    constraints: routine.constraints ?? '',
    field_id: routine.field_id ?? '',
    active: routine.active,
  };
}

interface RoutineModalProps {
  initial?: RoutineWithField | null;
  onClose: () => void;
  onSave: (payload: NewRoutine) => void;
  saving: boolean;
}

function RoutineModal({ initial, onClose, onSave, saving }: RoutineModalProps) {
  const { data: fields = [] } = useFields();
  const [form, setForm] = useState<RoutineForm>(() =>
    initial ? formFromRoutine(initial) : EMPTY_FORM
  );
  const set = <K extends keyof RoutineForm>(k: K, v: RoutineForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      ...form,
      name: form.name.trim(),
      constraints: form.constraints.trim() || null,
      estimate: form.estimate ? Number(form.estimate) : null,
      field_id: form.field_id || null,
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? 'Edit routine' : 'New routine'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : initial ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-ink-400 mb-1 block text-xs font-medium">
            Name
          </label>
          <TextInput
            autoFocus
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Gym, Change bed sheets"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-ink-400 mb-1 block text-xs font-medium">
              Frequency
            </label>
            <Select
              value={form.frequency}
              onChange={(e) => set('frequency', e.target.value)}
              className="w-full"
            >
              {FREQUENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-ink-400 mb-1 block text-xs font-medium">
              Preferred time
            </label>
            <Select
              value={form.preferred_time}
              onChange={(e) => set('preferred_time', e.target.value)}
              className="w-full"
            >
              {TIME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-ink-400 mb-1 block text-xs font-medium">
              Estimate (min)
            </label>
            <TextInput
              type="number"
              min="1"
              value={form.estimate}
              onChange={(e) => set('estimate', e.target.value)}
              placeholder="e.g. 60"
            />
          </div>
          <div>
            <label className="text-ink-400 mb-1 block text-xs font-medium">
              Field (optional)
            </label>
            <Select
              value={form.field_id}
              onChange={(e) => set('field_id', e.target.value)}
              className="w-full"
            >
              <option value="">None</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <label className="text-ink-400 mb-1 block text-xs font-medium">
            Scheduling notes{' '}
            <span className="text-ink-600">(the AI reads this)</span>
          </label>
          <textarea
            value={form.constraints}
            onChange={(e) => set('constraints', e.target.value)}
            placeholder="e.g. Can be done while at the gym — laundry room is in the same building area"
            rows={3}
            className="border-ink-600 bg-ink-900 text-ink-100 placeholder:text-ink-500 focus:border-copper-400 w-full resize-none rounded border px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <label className="text-ink-300 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => set('active', e.target.checked)}
            className="border-ink-600 bg-ink-800 accent-copper-500 h-4 w-4 rounded"
          />
          Active (included in AI planning)
        </label>
      </form>
    </Modal>
  );
}

function FrequencyLabel({ value }: { value: string }) {
  return (
    <span className="text-copper-400 font-mono text-xs">
      {FREQUENCY_OPTIONS.find((o) => o.value === value)?.label ?? value}
    </span>
  );
}

function TimeLabel({ value }: { value: string | null }) {
  return (
    <span className="text-ink-400 text-xs">
      {TIME_OPTIONS.find((o) => o.value === value)?.label ?? value}
    </span>
  );
}

export default function RoutinesPage() {
  const { data: routines = [], isLoading } = useRoutines();
  const { create, update, remove } = useRoutineMutations();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RoutineWithField | null>(null);

  function handleCreate(payload: NewRoutine) {
    create.mutate(payload, { onSuccess: () => setModalOpen(false) });
  }

  function handleUpdate(payload: NewRoutine) {
    if (!editing) return;
    update.mutate(
      { id: editing.id, patch: payload },
      { onSuccess: () => setEditing(null) }
    );
  }

  function handleDelete(routine: RoutineWithField) {
    if (window.confirm(`Delete routine "${routine.name}"?`)) {
      remove.mutate(routine.id);
    }
  }

  const active = routines.filter((r) => r.active);
  const inactive = routines.filter((r) => !r.active);

  return (
    <div className="mx-auto max-w-2xl px-6 py-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-ink-100 text-2xl">Routines</h1>
          <p className="text-ink-500 mt-0.5 text-sm">Ordo ab chao</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={14} /> New routine
        </Button>
      </div>

      {isLoading && <p className="text-ink-600 text-sm">Loading…</p>}

      {!isLoading && !routines.length && (
        <EmptyState
          icon={RefreshCw}
          title="No routines yet"
          hint='Add your recurring tasks and tell the assistant "plan my week" to schedule them automatically.'
        />
      )}

      {Boolean(active.length) && (
        <div className="space-y-2">
          {active.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onEdit={() => setEditing(routine)}
              onDelete={() => handleDelete(routine)}
              onToggle={() =>
                update.mutate({ id: routine.id, patch: { active: false } })
              }
            />
          ))}
        </div>
      )}

      {Boolean(inactive.length) && (
        <div className="mt-6">
          <p className="text-ink-600 mb-2 text-xs font-semibold tracking-wide uppercase">
            Inactive
          </p>
          <div className="space-y-2 opacity-50">
            {inactive.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                onEdit={() => setEditing(routine)}
                onDelete={() => handleDelete(routine)}
                onToggle={() =>
                  update.mutate({ id: routine.id, patch: { active: true } })
                }
              />
            ))}
          </div>
        </div>
      )}

      <div className="border-ink-700 bg-ink-800/40 mt-6 rounded-lg border px-4 py-3.5">
        <p className="text-ink-300 text-sm">
          Tell the assistant{' '}
          <span className="text-copper-400 font-mono">"plan my week"</span> and
          it will schedule all active routines around your fixed events.
        </p>
      </div>

      {modalOpen && (
        <RoutineModal
          onClose={() => setModalOpen(false)}
          onSave={handleCreate}
          saving={create.isPending}
        />
      )}
      {editing && (
        <RoutineModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={handleUpdate}
          saving={update.isPending}
        />
      )}
    </div>
  );
}

interface RoutineCardProps {
  routine: RoutineWithField;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

function RoutineCard({ routine, onEdit, onDelete, onToggle }: RoutineCardProps) {
  return (
    <div className="border-ink-700 bg-ink-800/40 flex items-start gap-3 rounded-lg border px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-ink-100 font-medium">{routine.name}</span>
          <FrequencyLabel value={routine.frequency} />
          <TimeLabel value={routine.preferred_time} />
          {routine.estimate && (
            <span className="text-ink-500 font-mono text-xs">
              {routine.estimate}min
            </span>
          )}
        </div>
        {routine.constraints && (
          <p className="text-ink-500 mt-1 text-xs leading-relaxed">
            {routine.constraints}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={onToggle}
          title={routine.active ? 'Deactivate' : 'Activate'}
          className="text-ink-500 hover:bg-ink-700 hover:text-ink-200 flex h-7 w-7 items-center justify-center rounded"
        >
          <CheckCircle
            size={14}
            className={routine.active ? 'text-sage-500' : ''}
          />
        </button>
        <button
          onClick={onEdit}
          className="text-ink-500 hover:bg-ink-700 hover:text-ink-200 flex h-7 w-7 items-center justify-center rounded"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onDelete}
          className="text-ink-500 hover:bg-ink-700 hover:text-rust-500 flex h-7 w-7 items-center justify-center rounded"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
