import { useNavigate } from 'react-router-dom';
import { StatusBadge, PriorityBadge, DueBadge, TargetBadge, FieldBadge } from '../common/ui';
import { getFieldMeta } from '../../lib/fieldsConfig';
import type { Project } from '../../lib/types';

interface ProjectRowProps {
  project: Project;
  fieldName?: string | null;
  sectionCount?: number;
  taskCount?: number;
}

// The row-shaped sibling to ProjectCard's grid tile -- for contexts a tile
// doesn't fit (e.g. a projects list view). TaskRow-shaped by design: name
// on its own line paired only with status, everything else shrink-wrapped
// into its own flex-wrap group -- same md: breakpoint that stacks the two
// groups on mobile (name always readable) and lines them up on one row
// once there's room, matching how TaskRow already handles the same
// too-many-badges problem. border-y (transparent) matches TaskRow's own
// border-transparent on all sides -- without it this row would render
// 2px shorter than TaskRow, since only the left edge had a border here.
export default function ProjectRow({
  project,
  fieldName,
  sectionCount,
  taskCount,
}: ProjectRowProps) {
  const navigate = useNavigate();
  const fieldColor = getFieldMeta(fieldName).color;

  return (
    <button
      onClick={() => navigate(`/projects/${project.id}`)}
      style={{ borderLeftColor: fieldColor }}
      className="group hover:bg-nyx-900 flex w-full flex-col gap-0.5 rounded-md border-y border-l-2 border-transparent py-1.5 pr-2 pl-2.5 text-left md:flex-row md:items-center md:gap-1.5"
    >
      <span className="flex min-w-0 items-center gap-1.5 md:flex-1">
        <FieldBadge fieldName={fieldName} size="xs" />
        <StatusBadge status={project.status} />
        <span className="text-nyx-100 min-w-0 flex-1 truncate text-body">
          {project.name}
        </span>
      </span>
      <span className="flex shrink-0 flex-wrap items-center gap-1">
        <PriorityBadge priority={project.priority} />
        <TargetBadge target={project.target as string | null} />
        <DueBadge due={project.due} status={project.status} />
        {Boolean(taskCount) && (
          <span className="text-nyx-600 shrink-0 text-caption">
            {sectionCount} section{sectionCount === 1 ? '' : 's'} · {taskCount} task
            {taskCount === 1 ? '' : 's'}
          </span>
        )}
      </span>
    </button>
  );
}
