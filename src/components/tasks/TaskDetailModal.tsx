import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useSyncActiveEntity } from '../../lib/activeEntityContext';
import {
  Plus,
  Trash2,
  Play,
  Square,
  X,
  CornerUpLeft,
  CornerDownRight,
  Clock,
  Flag,
  Target,
  DraftingCompass,
  Bot,
} from 'lucide-react';
import {
  Modal,
  Select,
  TextInput,
  Button,
  FieldBadge,
  Tag,
  TaskProgressBar,
  StatusPicker,
  PriorityPicker,
} from '../common/ui';
import TargetEditor from '../common/TargetEditor';
import {
  minutesToHuman,
  formatDue,
  parseMomentTime,
  isOverdue,
} from '../../lib/dateUtils';
import { parseRange, rangeDurationMinutes } from '../../lib/range';
import { computeTaskProgress } from '../../lib/taskProgress';
import {
  useTaskMutations,
  useTaskItems,
  useTaskItemMutations,
  useSections,
  useProjects,
  useFields,
  useTasks,
  useTasksSequence,
} from '../../hooks/useHierarchy';
import {
  useTaskLogs,
  useActiveTimer,
  useTimerMutations,
} from '../../hooks/useTimeTracking';
import { useTags, useTagLinks, useTagMutations } from '../../hooks/useTags';
import { useNotes, useNoteMutations } from '../../hooks/useMoments';
import { useTaskSequence, useSequenceMutations } from '../../hooks/useSequence';
import { wouldCreateCycle } from '../../lib/sequenceGraph';
import type {
  Id,
  Moment,
  MomentType,
  Priority,
  Status,
  Task,
  WorkTag,
} from '../../lib/types';

const MOMENT_TYPE_LABELS: Partial<Record<MomentType, string>> = {
  created: 'Created',
  due: 'Due date',
  estimate: 'Estimate',
  status: 'Status',
  started: 'Started',
  stopped: 'Stopped',
  scheduled: 'Scheduled',
  target: 'Target',
  priority: 'Priority',
};

function describeMoment(moment: Moment): string {
  const label = MOMENT_TYPE_LABELS[moment.moment_type] ?? moment.moment_type;
  if (moment.previous_value && moment.value) {
    return `${label}: ${moment.previous_value} → ${moment.value}`;
  }
  if (moment.value) return `${label}: ${moment.value}`;
  return label;
}

// One glyph per time-related moment type, matching the same icon a live
// field uses elsewhere (Flag for Due, bullseye for Target, drafting compass
// for Estimate, Play/Square for the task log). Scheduled gets a plain dot
// rather than a 7th shape — created/status/priority/note stay iconless.
function MomentIcon({ moment }: { moment: Moment }) {
  switch (moment.moment_type) {
    case 'due':
      return <Flag size={13} className="text-eros-400 mt-0.5 shrink-0" />;
    case 'target':
      return <Target size={13} className="text-nyx-400 mt-0.5 shrink-0" />;
    case 'estimate':
      return (
        <DraftingCompass size={13} className="text-nyx-400 mt-0.5 shrink-0" />
      );
    case 'started':
      return (
        <Play
          size={12}
          fill="currentColor"
          className="text-eros-500 mt-0.5 shrink-0"
        />
      );
    case 'stopped':
      return (
        <Square
          size={12}
          fill="currentColor"
          className="text-nyx-400 mt-0.5 shrink-0"
        />
      );
    case 'scheduled':
      return (
        <span className="bg-hypnos-400 mt-1.5 h-2 w-2 shrink-0 rounded-full" />
      );
    default:
      return null;
  }
}

interface SectionProps {
  title: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}

function Section({ title, children, action }: SectionProps) {
  return (
    <div className="border-nyx-700 border-t pt-4 first:border-0 first:pt-0">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-nyx-500 text-caption font-semibold tracking-wide uppercase">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

interface SequenceChipProps {
  task: Task;
  onOpen?: (task: Task) => void;
  onRemove: () => void;
}

function SequenceChip({ task, onOpen, onRemove }: SequenceChipProps) {
  return (
    <span className="bg-nyx-700 text-nyx-200 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption">
      <button
        type="button"
        onClick={() => onOpen?.(task)}
        disabled={!onOpen}
        className={onOpen ? 'hover:text-eros-400' : 'cursor-default'}
      >
        {task.name}
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="hover:text-tartarus-500"
        aria-label="Remover da sequência"
      >
        <X size={11} />
      </button>
    </span>
  );
}

interface AddButtonProps {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}

// Standard "add" CTA — same bordered-pill pattern as the Due/Target "Add
// time" toggles, so every add trigger in the modal reads the same way.
function AddButton({ active, onClick, children }: AddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-label transition-colors ${
        active
          ? 'border-eros-500 text-eros-400 bg-eros-500/10'
          : 'border-nyx-700 text-nyx-500 hover:text-nyx-300'
      }`}
    >
      <Plus size={10} /> {children}
    </button>
  );
}

// Local draft + debounced commit — lets text fields feel instant while
// typing without firing a mutation on every keystroke. Flushes immediately
// on blur so nothing is lost when the user tabs away or closes the modal.
function useDebouncedField<T>(
  value: T,
  commit: (next: T) => void,
  delay = 500
) {
  const [draft, setDraft] = useState(value);
  const draftRef = useRef(value);
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!dirtyRef.current) {
      setDraft(value);
      draftRef.current = value;
    }
  }, [value]);

  function set(next: T) {
    setDraft(next);
    draftRef.current = next;
    dirtyRef.current = true;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      dirtyRef.current = false;
      commit(next);
    }, delay);
  }

  function flush() {
    clearTimeout(timerRef.current);
    if (dirtyRef.current) {
      dirtyRef.current = false;
      commit(draftRef.current);
    }
  }

  return [draft, set, flush] as const;
}

interface SeqPicker {
  kind: 'before' | 'after';
  search: string;
}

interface TaskDetailModalProps {
  taskId: Id;
  task: Task;
  onClose: () => void;
  onOpenTask: (task: Task) => void;
}

export default function TaskDetailModal({
  taskId,
  task,
  onClose,
  onOpenTask,
}: TaskDetailModalProps) {
  const { update, remove } = useTaskMutations();
  useSyncActiveEntity('task', task.id, task.name);
  const { data: sections = [] } = useSections();
  const { data: projects = [] } = useProjects();
  const { data: fields = [] } = useFields();
  const { data: items = [] } = useTaskItems(taskId);
  const itemMutations = useTaskItemMutations(taskId);
  const { data: logs = [] } = useTaskLogs(taskId);
  const { data: activeLog } = useActiveTimer();
  const timer = useTimerMutations();
  const { data: allTags = [] } = useTags();
  const { data: tagLinks = [] } = useTagLinks();
  const tagMutations = useTagMutations();
  const { data: moments = [] } = useNotes({ task_id: taskId });
  const noteMutations = useNoteMutations({ task_id: taskId });

  const { data: allTasks = [] } = useTasks();
  const { data: seqEdges = [] } = useTasksSequence();
  const tasksById = useMemo(
    () => new Map(allTasks.map((t) => [t.id, t])),
    [allTasks]
  );
  const { before, after } = useTaskSequence(task.id, tasksById);
  const sequenceMutations = useSequenceMutations();
  const [seqPicker, setSeqPicker] = useState<SeqPicker | null>(null);
  const [seqError, setSeqError] = useState<string | null>(null);

  const [newItem, setNewItem] = useState('');
  const [newNote, setNewNote] = useState('');
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  const [showDueTime, setShowDueTime] = useState(() => {
    if (!task.due) return false;
    const timePart = task.due.split('T')[1];
    return Boolean(timePart) && !timePart.startsWith('00:00:00');
  });

  const section = sections.find((s) => s.id === task.section_id);
  const currentProject = projects.find((p) => p.id === section?.project_id);
  const fieldsById = useMemo(
    () => new Map(fields.map((f) => [f.id, f])),
    [fields]
  );
  const currentFieldName = currentProject?.field_id
    ? (fieldsById.get(currentProject.field_id)?.name ?? null)
    : null;
  const isActive = activeLog?.task_id === task.id;
  const otherTimerRunning = activeLog && activeLog.task_id !== task.id;

  const [nameDraft, setNameDraft, flushName] = useDebouncedField(
    task.name,
    (v) => patch({ name: v })
  );
  const [estimateDraft, setEstimateDraft, flushEstimate] = useDebouncedField(
    task.estimate != null ? String(task.estimate) : '',
    (v) => patch({ estimate: v ? Number(v) : null })
  );

  const taskTagLinks = useMemo(
    () => tagLinks.filter((l) => l.task_id === task.id),
    [tagLinks, task.id]
  );
  const taskTags = taskTagLinks
    .map((l) => allTags.find((t) => t.id === l.work_tag_id))
    .filter((t): t is WorkTag => Boolean(t));
  const availableTags = allTags.filter(
    (t) => !taskTags.some((tt) => tt.id === t.id)
  );

  const totalMinutes = logs.reduce(
    (sum, log) => sum + rangeDurationMinutes(log.duration),
    0
  );
  const progress = computeTaskProgress(task, logs);

  const linkedSequenceIds = useMemo(
    () =>
      new Set([task.id, ...before.map((t) => t.id), ...after.map((t) => t.id)]),
    [task.id, before, after]
  );

  const candidateTasks = seqPicker
    ? allTasks
        .filter((t) => !linkedSequenceIds.has(t.id))
        .filter((t) =>
          seqPicker.search.trim()
            ? t.name
                .toLowerCase()
                .includes(seqPicker.search.trim().toLowerCase())
            : true
        )
        .slice(0, 20)
    : [];

  const dueValues = useMemo(() => {
    if (!task.due) return { date: '', time: '' };
    const d = new Date(task.due);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`,
    };
  }, [task.due]);

  function handleDueChange(
    dateStr: string,
    timeStr: string,
    forceTimeActive?: boolean
  ) {
    if (!dateStr) {
      patch({ due: null });
      return;
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);

    const isTimeActive =
      forceTimeActive !== undefined ? forceTimeActive : showDueTime;

    if (isTimeActive && timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      localDate.setHours(hours, minutes, 0, 0);
    } else {
      localDate.setHours(0, 0, 0, 0);
    }

    patch({ due: localDate.toISOString() });
  }

  function handleAddSequence(otherTask: Task) {
    if (!seqPicker) return;
    const previousId = seqPicker.kind === 'before' ? otherTask.id : task.id;
    const nextId = seqPicker.kind === 'before' ? task.id : otherTask.id;

    if (wouldCreateCycle(seqEdges, previousId, nextId)) {
      setSeqError('Isso criaria uma sequência circular.');
      return;
    }
    setSeqError(null);
    sequenceMutations.add.mutate({ previousId, nextId });
    setSeqPicker(null);
  }

  function patch(fields: {
    name?: string;
    section_id?: string;
    status?: Status;
    priority?: Priority;
    estimate?: number | null;
    due?: string | null;
    target?: string | null;
  }) {
    update.mutate({ id: task.id, patch: fields });
  }

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.trim()) return;
    itemMutations.create.mutate({
      task_id: task.id,
      description: newItem.trim(),
      done: false,
    });
    setNewItem('');
  }

  function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim()) return;
    noteMutations.addNote.mutate(newNote.trim());
    setNewNote('');
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={
        <TextInput
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={flushName}
          className="focus:bg-nyx-900! w-full border-0! bg-transparent! px-0! py-0! text-display! font-medium!"
        />
      }
      width="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-nyx-500 hover:text-nyx-300 inline-flex min-w-0 items-center gap-1 text-caption">
            <FieldBadge fieldName={currentFieldName} size="xs" />
            <select
              value={section?.project_id ?? ''}
              onChange={(e) => {
                const projectId = e.target.value;
                const firstSection = sections.find(
                  (s) => s.project_id === projectId
                );
                if (firstSection) patch({ section_id: firstSection.id });
              }}
              className="focus-visible:ring-eros-400 max-w-32 cursor-pointer truncate border-0 bg-transparent p-0 text-caption focus:outline-none focus-visible:ring-1"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </span>
          <span className="text-nyx-600 text-caption">›</span>
          <Select
            value={task.section_id ?? ''}
            className="py-0.5! text-caption!"
            onChange={(e) => patch({ section_id: e.target.value })}
          >
            {sections
              .filter((s) => s.project_id === section?.project_id)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </Select>
        </div>

        {/* Form Grid reorganizada em pares de duas colunas */}
        <div className="space-y-3">
          {/* Linha 1: Status | Priority */}
          <div className="grid grid-cols-2 gap-3">
            <StatusPicker
              value={task.status}
              onChange={(status) => patch({ status })}
            />
            <PriorityPicker
              value={task.priority}
              onChange={(priority) => patch({ priority })}
            />
          </div>

          {/* Linha 2: Estimate | Due Date (+ Hora opcional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-nyx-500 mb-1 block text-caption font-medium">
                Estimate
              </label>
              <div className="border-nyx-600 bg-nyx-800 focus-within:border-eros-400 flex items-center gap-2 rounded border px-3 py-2">
                <DraftingCompass size={15} className="text-nyx-500 shrink-0" />
                <input
                  type="number"
                  min="0"
                  value={estimateDraft}
                  onChange={(e) => setEstimateDraft(e.target.value)}
                  onBlur={flushEstimate}
                  className="text-nyx-100 font-mono! w-full min-w-0 bg-transparent text-body focus:outline-none"
                />
                <span className="text-nyx-500 shrink-0 text-caption">min</span>
              </div>
              {progress && (
                <TaskProgressBar
                  progress={progress}
                  size="full"
                  className="mt-1.5"
                />
              )}
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-nyx-500 flex items-center gap-1 text-caption font-medium">
                  <Flag
                    size={11}
                    className={
                      isOverdue(task.due, task.status)
                        ? 'text-tartarus-500'
                        : 'text-eros-400'
                    }
                  />
                  Due
                </label>
                {dueValues.date && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !showDueTime;
                      setShowDueTime(nextState);
                      if (!nextState) {
                        handleDueChange(dueValues.date, '00:00', false);
                      }
                    }}
                    className={`flex items-center gap-0.5 rounded border px-1 text-label transition-colors ${
                      showDueTime
                        ? 'border-eros-500 text-eros-400 bg-eros-500/10'
                        : 'border-nyx-700 text-nyx-500 hover:text-nyx-300'
                    }`}
                  >
                    <Clock size={10} />{' '}
                    {showDueTime ? 'Remove time' : 'Add time'}
                  </button>
                )}
              </div>
              <div className="flex gap-1">
                <TextInput
                  type="date"
                  value={dueValues.date}
                  onChange={(e) => {
                    handleDueChange(e.target.value, dueValues.time);
                  }}
                  className="w-full"
                />
                {showDueTime && dueValues.date && (
                  <TextInput
                    type="time"
                    value={dueValues.time || '12:00'}
                    onChange={(e) => {
                      handleDueChange(dueValues.date, e.target.value, true);
                    }}
                    className="w-20 shrink-0 text-center"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="text-nyx-500 mb-1 block text-caption font-medium">
            Target{' '}
            <span className="text-nyx-600 font-normal normal-case">
              (planned window — optional, primarily dates, exported as
              tstzrange)
            </span>
          </label>
          <TargetEditor
            value={task.target as string | null}
            due={task.due}
            onChange={(v) => patch({ target: v })}
          />
        </div>

        <Section title="Sequence">
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-nyx-400 flex items-center gap-1 text-caption font-medium">
                    <CornerUpLeft size={12} /> Previous tasks
                  </span>
                  <AddButton
                    active={seqPicker?.kind === 'before'}
                    onClick={() => {
                      setSeqError(null);
                      setSeqPicker({ kind: 'before', search: '' });
                    }}
                  >
                    Add
                  </AddButton>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {before.map((t) => (
                    <SequenceChip
                      key={t.id}
                      task={t}
                      onOpen={onOpenTask}
                      onRemove={() =>
                        sequenceMutations.remove.mutate({
                          previousId: t.id,
                          nextId: task.id,
                        })
                      }
                    />
                  ))}
                  {!before.length && (
                    <p className="text-nyx-600 text-caption">None</p>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-nyx-400 flex items-center gap-1 text-caption font-medium">
                    <CornerDownRight size={12} /> Next tasks
                  </span>
                  <AddButton
                    active={seqPicker?.kind === 'after'}
                    onClick={() => {
                      setSeqError(null);
                      setSeqPicker({ kind: 'after', search: '' });
                    }}
                  >
                    Add
                  </AddButton>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {after.map((t) => (
                    <SequenceChip
                      key={t.id}
                      task={t}
                      onOpen={onOpenTask}
                      onRemove={() =>
                        sequenceMutations.remove.mutate({
                          previousId: task.id,
                          nextId: t.id,
                        })
                      }
                    />
                  ))}
                  {!after.length && <p className="text-nyx-600 text-caption">None</p>}
                </div>
              </div>
            </div>

            {seqPicker && (
              <div className="border-nyx-700 bg-nyx-900 rounded-md border p-2">
                <input
                  autoFocus
                  value={seqPicker.search}
                  onChange={(e) =>
                    setSeqPicker({ ...seqPicker, search: e.target.value })
                  }
                  placeholder="Buscar tarefa…"
                  className="border-nyx-600 bg-nyx-800 text-nyx-100 placeholder:text-nyx-500 mb-2 w-full rounded border px-2 py-1.5 text-caption focus:outline-hidden"
                />
                {seqError && (
                  <p className="text-tartarus-500 mb-1.5 text-caption">{seqError}</p>
                )}
                <div className="max-h-40 space-y-0.5 overflow-y-auto">
                  {candidateTasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleAddSequence(t)}
                      className="text-nyx-300 hover:bg-nyx-800 w-full truncate rounded px-2 py-1 text-left text-caption"
                    >
                      {t.name}
                    </button>
                  ))}
                  {!candidateTasks.length && (
                    <p className="text-nyx-600 px-2 py-1 text-caption">
                      Nada encontrado
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSeqPicker(null);
                    setSeqError(null);
                  }}
                  className="text-nyx-500 hover:text-nyx-300 mt-2 text-caption"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </Section>

        <Section
          title="Tags"
          action={
            <AddButton
              active={tagPickerOpen}
              onClick={() => setTagPickerOpen((o) => !o)}
            >
              Add tag
            </AddButton>
          }
        >
          <div className="flex flex-wrap gap-1.5">
            {taskTags.map((tag) => (
              <Tag
                key={tag.id}
                onRemove={() =>
                  tagMutations.detach.mutate({
                    tagId: tag.id,
                    entityRef: { task_id: task.id },
                  })
                }
              >
                {tag.name}
              </Tag>
            ))}
            {!taskTags.length && (
              <p className="text-nyx-600 text-caption">No tags yet</p>
            )}
          </div>
          {tagPickerOpen && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => {
                    tagMutations.attach.mutate({
                      tagId: tag.id,
                      entityRef: { task_id: task.id },
                    });
                    setTagPickerOpen(false);
                  }}
                  className="border-nyx-600 text-nyx-300 rounded-full border px-2 py-0.5 text-caption hover:border-pontus-500 hover:text-pontus-400"
                >
                  {tag.name}
                </button>
              ))}
              {!availableTags.length && (
                <p className="text-nyx-600 text-caption">
                  No more tags — create one on the Tags page
                </p>
              )}
            </div>
          )}
        </Section>

        <Section
          title={`Checklist (${items.filter((i) => i.done).length}/${items.length})`}
        >
          <div className="space-y-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="group hover:bg-nyx-900 flex items-center gap-2 rounded px-1.5 py-1"
              >
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={(e) =>
                    itemMutations.update.mutate({
                      id: item.id,
                      patch: { done: e.target.checked },
                    })
                  }
                  className="border-nyx-600 bg-nyx-800 accent-eros-500 h-4 w-4 rounded"
                />
                <span className={clsxDone(item.done)}>{item.description}</span>
                <button
                  onClick={() => itemMutations.remove.mutate(item.id)}
                  className="ml-auto opacity-0 group-hover:opacity-100"
                >
                  <X size={13} className="text-nyx-500 hover:text-tartarus-500" />
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={addItem} className="mt-1.5 flex items-center gap-1.5">
            <Plus size={14} className="text-nyx-500" />
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add a checklist item…"
              className="text-nyx-200 placeholder:text-nyx-600 flex-1 bg-transparent py-1 text-body focus:outline-none"
            />
          </form>
        </Section>

        <Section
          title={`Time logged — ${minutesToHuman(totalMinutes)}`}
          action={
            isActive ? (
              <Button
                size="sm"
                variant="danger"
                onClick={() => timer.stop.mutate()}
              >
                <Square size={12} fill="currentColor" /> Stop
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                disabled={Boolean(otherTimerRunning)}
                title={
                  otherTimerRunning
                    ? 'Stop the other running timer first'
                    : undefined
                }
                onClick={() => timer.start.mutate(task.id)}
              >
                <Play size={12} fill="currentColor" /> Start
              </Button>
            )
          }
        >
          <div className="space-y-1">
            {logs.slice(0, 8).map((log) => {
              const { start, end } = parseRange(log.duration);
              return (
                <div
                  key={log.id}
                  className="text-nyx-400 flex items-center justify-between text-caption"
                >
                  <span>
                    {start ? formatDue(start) : '—'}{' '}
                    {end ? `→ ${formatDue(end)}` : '(running)'}
                  </span>
                  <span className="tabular font-mono">
                    {minutesToHuman(rangeDurationMinutes(log.duration))}
                  </span>
                </div>
              );
            })}
            {!logs.length && (
              <p className="text-nyx-600 text-caption">No time logged yet</p>
            )}
          </div>
        </Section>

        <Section title="Moments">
          <div className="space-y-2">
            {moments.map((moment) => (
              <div
                key={moment.id}
                className="group bg-nyx-900 text-nyx-300 rounded px-2 py-2 text-body"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-start gap-1.5">
                    <MomentIcon moment={moment} />
                    <div className="min-w-0 flex-1">
                      {moment.moment_type !== 'note' && (
                        <p className="text-nyx-400 text-caption font-medium">
                          {describeMoment(moment)}
                        </p>
                      )}
                      {moment.moment_note && (
                        <p className="flex items-start gap-1 whitespace-pre-wrap">
                          {moment.authored_by !== 'user' && (
                            <Bot
                              size={12}
                              className="text-nyx-500 mt-0.5 shrink-0"
                              aria-label={`Note ${moment.authored_by === 'assistant' ? 'written by the assistant' : 'auto-generated'}`}
                            />
                          )}
                          <span>{moment.moment_note}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => noteMutations.remove.mutate(moment.id)}
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <X size={12} className="text-nyx-500 hover:text-tartarus-500" />
                  </button>
                </div>
                <p className="text-nyx-600 mt-1 text-[11px]">
                  {formatDue(parseMomentTime(moment.created_at))}
                </p>
              </div>
            ))}
            {!moments.length && (
              <p className="text-nyx-600 text-caption">No moments yet</p>
            )}
          </div>
          <form onSubmit={addNote} className="mt-2 flex items-center gap-1.5">
            <TextInput
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note…"
              className="flex-1"
            />
            <Button type="submit" size="sm" variant="secondary">
              Add
            </Button>
          </form>
        </Section>

        <div className="border-nyx-700 flex justify-end border-t pt-4">
          <button
            onClick={() => remove.mutate(task.id, { onSuccess: onClose })}
            className="text-nyx-500 hover:text-nyx-300 flex items-center gap-1 text-caption"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}

function clsxDone(done: boolean): string {
  return done
    ? 'flex-1 text-body text-nyx-600 line-through'
    : 'flex-1 text-body text-nyx-200';
}
