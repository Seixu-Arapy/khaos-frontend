import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  GripVertical,
  Plus,
  MoreVertical,
  Trash2,
  CalendarRange,
  Info,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Select, Modal, TargetBadge } from '../common/ui';
import TargetEditor from '../common/TargetEditor';
import { STATUSES, STATUS_META } from '../../lib/constants';
import {
  useTaskMutations,
  useSectionMutations,
} from '../../hooks/useHierarchy';
import TaskRow from '../tasks/TaskRow';
import type { Id, Section, Status, Task } from '../../lib/types';

interface SectionColumnProps {
  section: Section;
  orderedTasks: Task[];
  onOpenTask: (task: Task) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
}

export default function SectionColumn({
  section,
  orderedTasks,
  onOpenTask,
  dragHandleProps,
}: SectionColumnProps) {
  const { create: createTask } = useTaskMutations();
  const { update: updateSection, remove: removeSection } =
    useSectionMutations();
  const [newTaskName, setNewTaskName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);

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
      <div className="border-ink-700 flex items-center gap-2 border-b px-3 py-2.5">
        <span
          {...dragHandleProps}
          className="text-ink-600 hover:text-ink-300 cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </span>
        <input
          value={section.name}
          onChange={(e) =>
            updateSection.mutate({
              id: section.id,
              patch: { name: e.target.value },
            })
          }
          className="text-ink-100 flex-1 bg-transparent text-body font-medium focus:outline-none"
        />
        <span
          className="text-ink-600 hover:text-ink-300 flex shrink-0 items-center"
          title="Tasks below are ordered by target start date, then due date — tasks with neither go last."
        >
          <Info size={13} />
        </span>
        <button
          onClick={() => setTargetOpen(true)}
          className="text-ink-500 hover:text-ink-200 flex shrink-0 items-center"
          title="Edit target"
        >
          {section.target ? (
            <TargetBadge target={section.target as string | null} />
          ) : (
            <CalendarRange size={14} />
          )}
        </button>
        <Select
          value={section.status}
          onChange={(e) =>
            updateSection.mutate({
              id: section.id,
              patch: { status: e.target.value as Status },
            })
          }
          className="py-1! text-caption!"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </Select>
        <div className="relative">
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
                className="text-ink-400 hover:bg-ink-700 flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-caption"
              >
                <Trash2 size={12} /> Remove section
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-2">
        <div className="space-y-0.5">
          {orderedTasks.map((task) => (
            <TaskRow key={task.id} task={task} onOpen={onOpenTask} />
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
            className="text-ink-300 placeholder:text-ink-600 flex-1 bg-transparent py-0.5 text-body focus:outline-none"
          />
        </form>
      </div>

      <Modal
        open={targetOpen}
        onClose={() => setTargetOpen(false)}
        title={`Target — ${section.name}`}
      >
        <TargetEditor
          value={section.target as string | null}
          due={section.due}
          onChange={(v) =>
            updateSection.mutate({ id: section.id, patch: { target: v } })
          }
        />
      </Modal>
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
