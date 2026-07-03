import { GripVertical } from 'lucide-react';
import { StatusBadge, PriorityBadge, DueBadge } from '../common/ui';
import { minutesToHuman } from '../../lib/dateUtils';
import type { Task } from '../../lib/types';

const DIMMED: Task['status'][] = ['done', 'cancelled', 'archived'];

interface TaskRowProps {
  task: Task;
  onOpen: (task: Task) => void;
  project?: string | null;
  dragRef?: React.Ref<HTMLDivElement>;
  dragStyle?: React.CSSProperties;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
}

export default function TaskRow({
  task,
  onOpen,
  project,
  dragRef,
  dragStyle,
  dragHandleProps,
}: TaskRowProps) {
  const draggable = Boolean(dragHandleProps);
  const dimmed = DIMMED.includes(task.status);

  return (
    <div
      ref={dragRef}
      style={{ ...dragStyle, opacity: dimmed ? 0.38 : 1 }}
      className="group hover:border-ink-700 hover:bg-ink-900 flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1.5"
    >
      {draggable && (
        <span
          {...dragHandleProps}
          className="text-ink-700 hover:text-ink-400 cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={13} />
        </span>
      )}

      <button
        onClick={() => onOpen(task)}
        className="flex min-w-0 flex-1 items-center gap-1 text-left"
      >
        <StatusBadge status={task.status} />
        <span
          className={`text-ink-100 truncate text-sm ${
            task.status === 'cancelled' ? 'line-through' : ''
          }`}
        >
          {task.name}
        </span>
        <PriorityBadge priority={task.priority} />
      </button>

      {project && (
        <span className="text-ink-500 hidden max-w-32 shrink truncate text-xs sm:block">
          {project}
        </span>
      )}

      {task.estimate ? (
        <span className="text-ink-600 hidden shrink-0 font-mono text-xs md:block">
          {minutesToHuman(task.estimate)}
        </span>
      ) : null}

      <DueBadge due={task.due} status={task.status} />
    </div>
  );
}
