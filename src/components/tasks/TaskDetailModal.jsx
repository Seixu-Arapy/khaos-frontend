import { useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Play,
  Square,
  X,
  CornerUpLeft,
  CornerDownRight,
} from 'lucide-react';
import {
  Modal,
  Select,
  TextInput,
  Button,
  StatusBadge,
  Tag,
} from '../common/ui';
import ScheduleEditor from '../common/TargetEditor';
import { STATUSES, PRIORITIES } from '../../lib/constants';
import {
  toDatetimeLocalValue,
  minutesToHuman,
  formatDue,
  parseMomentTime,
} from '../../lib/dateUtils';
import { parseRange, rangeDurationMinutes } from '../../lib/range';
import {
  useTaskMutations,
  useTaskItems,
  useTaskItemMutations,
  useSections,
  useProjects,
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

function Section({ title, children, action }) {
  return (
    <div className="border-ink-700 border-t pt-3.5 first:border-0 first:pt-0">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-ink-500 text-xs font-semibold tracking-wide uppercase">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function SequenceChip({ task, onOpen, onRemove }) {
  return (
    <span className="bg-ink-700 text-ink-200 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs">
      <button
        type="button"
        onClick={() => onOpen?.(task)}
        disabled={!onOpen}
        className={onOpen ? 'hover:text-copper-400' : 'cursor-default'}
      >
        {task.name}
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="hover:text-rust-500"
        aria-label="Remover da sequência"
      >
        <X size={11} />
      </button>
    </span>
  );
}

export default function TaskDetailModal({ taskId, task, onClose, onOpenTask }) {
  const { update, remove } = useTaskMutations();
  const { data: sections = [] } = useSections();
  const { data: projects = [] } = useProjects();
  const { data: items = [] } = useTaskItems(taskId);
  const itemMutations = useTaskItemMutations(taskId);
  const { data: logs = [] } = useTaskLogs(taskId);
  const { data: activeLog } = useActiveTimer();
  const timer = useTimerMutations();
  const { data: allTags = [] } = useTags();
  const { data: tagLinks = [] } = useTagLinks();
  const tagMutations = useTagMutations();
  const { data: notes = [] } = useNotes({ task_id: taskId });
  const noteMutations = useNoteMutations({ task_id: taskId });

  const { data: allTasks = [] } = useTasks();
  const { data: seqEdges = [] } = useTasksSequence();
  const tasksById = useMemo(
    () => new Map(allTasks.map((t) => [t.id, t])),
    [allTasks]
  );
  const { before, after } = useTaskSequence(task.id, tasksById);
  const sequenceMutations = useSequenceMutations();
  const [seqPicker, setSeqPicker] = useState(null); // { kind: 'before' | 'after', search }
  const [seqError, setSeqError] = useState(null);

  const [newItem, setNewItem] = useState('');
  const [newNote, setNewNote] = useState('');
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  const section = sections.find((s) => s.id === task.section_id);
  const project = projects.find((p) => p.id === section?.project_id);
  const isActive = activeLog?.task_id === task.id;
  const otherTimerRunning = activeLog && activeLog.task_id !== task.id;

  const taskTagLinks = useMemo(
    () => tagLinks.filter((l) => l.task_id === task.id),
    [tagLinks, task.id]
  );
  const taskTags = taskTagLinks
    .map((l) => allTags.find((t) => t.id === l.work_tag_id))
    .filter(Boolean);
  const availableTags = allTags.filter(
    (t) => !taskTags.some((tt) => tt.id === t.id)
  );

  const totalMinutes = logs.reduce(
    (sum, log) => sum + rangeDurationMinutes(log.duration),
    0
  );

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

  function handleAddSequence(otherTask) {
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

  function patch(fields) {
    update.mutate({ id: task.id, patch: fields });
  }

  function addItem(e) {
    e.preventDefault();
    if (!newItem.trim()) return;
    itemMutations.create.mutate({
      task_id: task.id,
      description: newItem.trim(),
      done: false,
    });
    setNewItem('');
  }

  function addNote(e) {
    e.preventDefault();
    if (!newNote.trim()) return;
    noteMutations.addNote.mutate(newNote.trim());
    setNewNote('');
  }

  function handleDelete() {
    if (window.confirm(`Delete "${task.name}"? This can't be undone.`)) {
      remove.mutate(task.id, { onSuccess: onClose });
    }
  }

  return (
    <Modal open onClose={onClose} title="Task" width="max-w-2xl">
      <div className="space-y-4">
        <div>
          <TextInput
            value={task.name}
            onChange={(e) => patch({ name: e.target.value })}
            className="focus:bg-ink-900! border-0! bg-transparent! px-0! text-lg! font-medium!"
          />
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Select
              value={section?.project_id ?? ''}
              className="py-0.5! text-xs!"
              onChange={(e) => {
                const projectId = e.target.value;
                const firstSection = sections.find(
                  (s) => s.project_id === projectId
                );
                if (firstSection) patch({ section_id: firstSection.id });
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <span className="text-ink-600 text-xs">›</span>
            <Select
              value={task.section_id ?? ''}
              className="py-0.5! text-xs!"
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
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="text-ink-500 mb-1 block text-xs font-medium">
              Status
            </label>
            <Select
              value={task.status}
              onChange={(e) => patch({ status: e.target.value })}
              className="w-full"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-ink-500 mb-1 block text-xs font-medium">
              Priority
            </label>
            <Select
              value={task.priority || 'medium'}
              onChange={(e) => patch({ priority: e.target.value })}
              className="w-full"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-ink-500 mb-1 block text-xs font-medium">
              Due
            </label>
            <TextInput
              type="datetime-local"
              value={toDatetimeLocalValue(task.due)}
              onChange={(e) =>
                patch({
                  due: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                })
              }
            />
          </div>
          <div>
            <label className="text-ink-500 mb-1 block text-xs font-medium">
              Estimate (min)
            </label>
            <TextInput
              type="number"
              min="0"
              value={task.estimate ?? ''}
              onChange={(e) =>
                patch({
                  estimate: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
        </div>

        <div>
          <label className="text-ink-500 mb-1 block text-xs font-medium">
            Schedule{' '}
            <span className="text-ink-600 font-normal normal-case">
              (planned window — optional, must land before due)
            </span>
          </label>
          <ScheduleEditor
            value={task.schedule}
            due={task.due}
            onChange={(v) => patch({ schedule: v })}
          />
        </div>

        <Section title="Sequência">
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-ink-400 flex items-center gap-1 text-xs font-medium">
                  <CornerUpLeft size={12} /> Antes desta tarefa
                </span>
                <button
                  onClick={() => {
                    setSeqError(null);
                    setSeqPicker({ kind: 'before', search: '' });
                  }}
                  className="text-copper-400 hover:text-copper-300 text-xs"
                >
                  + Adicionar
                </button>
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
                  <p className="text-ink-600 text-xs">Nenhuma</p>
                )}
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-ink-400 flex items-center gap-1 text-xs font-medium">
                  <CornerDownRight size={12} /> Depois desta tarefa
                </span>
                <button
                  onClick={() => {
                    setSeqError(null);
                    setSeqPicker({ kind: 'after', search: '' });
                  }}
                  className="text-copper-400 hover:text-copper-300 text-xs"
                >
                  + Adicionar
                </button>
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
                {!after.length && (
                  <p className="text-ink-600 text-xs">Nenhuma</p>
                )}
              </div>
            </div>

            {seqPicker && (
              <div className="border-ink-700 bg-ink-900 rounded-md border p-2.5">
                <input
                  autoFocus
                  value={seqPicker.search}
                  onChange={(e) =>
                    setSeqPicker({ ...seqPicker, search: e.target.value })
                  }
                  placeholder="Buscar tarefa…"
                  className="border-ink-600 bg-ink-800 text-ink-100 placeholder:text-ink-500 mb-2 w-full rounded border px-2.5 py-1.5 text-xs focus:outline-hidden"
                />
                {seqError && (
                  <p className="text-rust-500 mb-1.5 text-xs">{seqError}</p>
                )}
                <div className="max-h-40 space-y-0.5 overflow-y-auto">
                  {candidateTasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleAddSequence(t)}
                      className="text-ink-300 hover:bg-ink-800 w-full truncate rounded px-2 py-1 text-left text-xs"
                    >
                      {t.name}
                    </button>
                  ))}
                  {!candidateTasks.length && (
                    <p className="text-ink-600 px-2 py-1 text-xs">
                      Nada encontrado
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSeqPicker(null);
                    setSeqError(null);
                  }}
                  className="text-ink-500 hover:text-ink-300 mt-2 text-xs"
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
            <button
              onClick={() => setTagPickerOpen((o) => !o)}
              className="text-copper-400 hover:text-copper-300 text-xs"
            >
              + Add tag
            </button>
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
              <p className="text-ink-600 text-xs">No tags yet</p>
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
                  className="border-ink-600 text-ink-300 rounded-full border px-2 py-0.5 text-xs hover:border-teal-500 hover:text-teal-400"
                >
                  {tag.name}
                </button>
              ))}
              {!availableTags.length && (
                <p className="text-ink-600 text-xs">
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
                className="group hover:bg-ink-900 flex items-center gap-2 rounded px-1.5 py-1"
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
                  className="border-ink-600 bg-ink-800 accent-copper-500 h-4 w-4 rounded"
                />
                <span className={clsxDone(item.done)}>{item.description}</span>
                <button
                  onClick={() => itemMutations.remove.mutate(item.id)}
                  className="ml-auto opacity-0 group-hover:opacity-100"
                >
                  <X size={13} className="text-ink-500 hover:text-rust-500" />
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={addItem} className="mt-1.5 flex items-center gap-1.5">
            <Plus size={14} className="text-ink-500" />
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add a checklist item…"
              className="text-ink-200 placeholder:text-ink-600 flex-1 bg-transparent py-1 text-sm focus:outline-none"
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
                disabled={otherTimerRunning}
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
                  className="text-ink-400 flex items-center justify-between text-xs"
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
              <p className="text-ink-600 text-xs">No time logged yet</p>
            )}
          </div>
        </Section>

        <Section title="Notes">
          <div className="space-y-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className="group bg-ink-900 text-ink-300 rounded px-2.5 py-2 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="whitespace-pre-wrap">{note.moment_note}</p>
                  <button
                    onClick={() => noteMutations.remove.mutate(note.id)}
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <X size={12} className="text-ink-500 hover:text-rust-500" />
                  </button>
                </div>
                <p className="text-ink-600 mt-1 text-[11px]">
                  {formatDue(parseMomentTime(note.created_at))}
                </p>
              </div>
            ))}
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

        <div className="border-ink-700 flex justify-between border-t pt-3.5">
          <StatusBadge status={task.status} size="md" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => remove.mutate(task.id, { onSuccess: onClose })}
              className="text-ink-500 hover:text-ink-300 flex items-center gap-1 text-xs"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function clsxDone(done) {
  return done
    ? 'flex-1 text-sm text-ink-600 line-through'
    : 'flex-1 text-sm text-ink-200';
}
