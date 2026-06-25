import { GripVertical } from 'lucide-react';
import { StatusBadge, PriorityBadge, DueBadge } from '../common/ui';

/**
 * Shared task row used across list views.
 *
 * Props:
 *   task             — the task object
 *   onOpen           — called with task when the row is clicked
 *   project          — optional project name string shown as a label
 *   dragRef          — ref from useSortable (SectionColumn)
 *   dragStyle        — style from useSortable (SectionColumn)
 *   dragHandleProps  — attributes + listeners from useSortable (SectionColumn)
 */
export default function TaskRow({
  task,
  onOpen,
  project,
  dragRef,
  dragStyle,
  dragHandleProps,
}) {
  const draggable = Boolean(dragRef);

  return (
    <div
      ref={dragRef}
      style={dragStyle}
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
        <span className="text-ink-100 truncate text-sm">{task.name}</span>
        <PriorityBadge priority={task.priority} />
      </button>

      {project && (
        <span className="text-ink-500 hidden max-w-32 shrink truncate text-xs sm:block">
          {project}
        </span>
      )}

      <DueBadge due={task.due} status={task.status} />
    </div>
  );
}
