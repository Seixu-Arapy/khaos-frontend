import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  GripVertical,
  Plus,
  MoreVertical,
  Trash2,
  CalendarRange,
  Info,
  ChevronDown,
  ChevronRight,
  ChevronUp,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  TargetBadge,
  StatusBadge,
  StatusPicker,
  PriorityPicker,
} from '../common/ui';
import TargetEditor from '../common/TargetEditor';
import {
  useTaskMutations,
  useSectionMutations,
  useTasksSequence,
} from '../../hooks/useHierarchy';
import { buildSequenceRail } from '../../lib/sequenceGraph';
import TaskRow from '../tasks/TaskRow';
import SequenceRailCell from './SequenceRail';
import type { Id, Section, Task } from '../../lib/types';

interface SectionColumnProps {
  section: Section;
  orderedTasks: Task[];
  onOpenTask: (task: Task) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export default function SectionColumn({
  section,
  orderedTasks,
  onOpenTask,
  dragHandleProps,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: SectionColumnProps) {
  const { create: createTask } = useTaskMutations();
  const { update: updateSection, remove: removeSection } =
    useSectionMutations();
  const { data: seqEdges = [] } = useTasksSequence();
  const rail = useMemo(
    () =>
      buildSequenceRail(
        orderedTasks.map((t) => t.id),
        seqEdges
      ),
    [orderedTasks, seqEdges]
  );
  const [newTaskName, setNewTaskName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);

  const settled = section.status === 'done' || section.status === 'cancelled';
  const [collapsed, setCollapsed] = useState(() => settled);
  // Auto-collapse the moment a section is marked done/cancelled, adjusted
  // during render (not an effect) — doesn't force it back open if the user
  // re-activates it while already collapsed.
  const [prevSettled, setPrevSettled] = useState(settled);
  if (settled !== prevSettled) {
    setPrevSettled(settled);
    if (settled) setCollapsed(true);
  }

  function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskName.trim()) return;
    createTask.mutate({
      section_id: section.id,
      name: newTaskName.trim(),
      status: 'todo',
    });
    setNewTaskName('');
  }

  return (
    <div className="border-ink-700 bg-ink-800/40 rounded-lg border">
      <div className="border-ink-700 space-y-2 border-b px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            {...dragHandleProps}
            className="text-ink-600 hover:text-ink-300 cursor-grab active:cursor-grabbing"
          >
            <GripVertical size={14} />
          </span>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-ink-500 hover:text-ink-200 flex shrink-0 items-center"
            title={collapsed ? 'Expand section' : 'Collapse section'}
          >
            {collapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
          </button>
          <input
            value={section.name}
            onChange={(e) =>
              updateSection.mutate({
                id: section.id,
                patch: { name: e.target.value },
              })
            }
            className="text-ink-100 min-w-0 flex-1 bg-transparent text-sm font-medium focus:outline-none"
          />
          {collapsed && (
            <span className="text-ink-600 shrink-0 font-mono text-xs">
              {orderedTasks.length}
            </span>
          )}
          <div className="flex shrink-0 items-center">
            <button
              onClick={onMoveUp}
              disabled={!canMoveUp}
              title="Move section up"
              className="text-ink-500 hover:text-ink-200 disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronUp size={15} />
            </button>
            <button
              onClick={onMoveDown}
              disabled={!canMoveDown}
              title="Move section down"
              className="text-ink-500 hover:text-ink-200 disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronDown size={15} />
            </button>
          </div>
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="text-ink-500 hover:text-ink-200"
            >
              <MoreVertical size={15} />
            </button>
            {menuOpen && (
              <div className="border-ink-700 bg-ink-800 shadow-panel absolute right-0 z-10 mt-1 w-44 rounded-md border py-1">
                <button
                  onClick={() => {
                    removeSection.mutate(section.id);
                    setMenuOpen(false);
                  }}
                  className="text-ink-400 hover:bg-ink-700 flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs"
                >
                  <Trash2 size={12} /> Remove section
                </button>
              </div>
            )}
          </div>
        </div>

        {collapsed ? (
          <div className="flex items-center gap-2">
            <StatusBadge status={section.status} />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-ink-600 hover:text-ink-300 flex shrink-0 items-center"
              title="Tasks below are ordered by target start date, then due date — tasks with neither go last."
            >
              <Info size={13} />
            </span>
            <button
              onClick={() => setTargetOpen((o) => !o)}
              className="text-ink-500 hover:text-ink-200 flex shrink-0 items-center"
              title={targetOpen ? 'Hide target editor' : 'Edit target'}
            >
              {section.target ? (
                <TargetBadge target={section.target as string | null} />
              ) : (
                <CalendarRange size={14} />
              )}
            </button>
            <StatusPicker
              value={section.status}
              onChange={(status) =>
                updateSection.mutate({ id: section.id, patch: { status } })
              }
            />
            <PriorityPicker
              value={section.priority}
              onChange={(priority) =>
                updateSection.mutate({ id: section.id, patch: { priority } })
              }
            />
          </div>
        )}

        {targetOpen && !collapsed && (
          <div className="border-ink-700 bg-ink-900/50 rounded-md border p-2.5">
            <TargetEditor
              value={section.target as string | null}
              due={section.due}
              onChange={(v) =>
                updateSection.mutate({ id: section.id, patch: { target: v } })
              }
            />
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="p-2">
          <div className="space-y-0.5">
            {orderedTasks.map((task, index) => (
              <div key={task.id} className="flex items-stretch">
                {rail.laneCount > 0 && (
                  <SequenceRailCell
                    segments={rail.rows[index]}
                    laneCount={rail.laneCount}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <TaskRow task={task} onOpen={onOpenTask} />
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={addTask}
            className="mt-1 flex items-center gap-1.5 px-2 py-1"
          >
            <Plus size={13} className="text-ink-600" />
            <input
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              placeholder="Add a task…"
              className="text-ink-300 placeholder:text-ink-600 flex-1 bg-transparent py-0.5 text-sm focus:outline-none"
            />
          </form>
        </div>
      )}
    </div>
  );
}

interface SortableSectionWrapperProps {
  id: Id;
  children: (
    dragProps: Record<string, unknown>
  ) => ReactNode;
}

export function SortableSectionWrapper({
  id,
  children,
}: SortableSectionWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}
