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
// doesn't fit (e.g. a projects list view). TaskRow-shaped by design: one
// line, icon+status+name on the left, everything else shrink-wrapped on
// the right, matching how the app already reads a row of work.
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
      className="group hover:bg-nyx-900 flex w-full items-center gap-1.5 rounded-md border-l-2 py-1.5 pr-2 pl-2.5 text-left"
    >
      <FieldBadge fieldName={fieldName} size="xs" />
      <StatusBadge status={project.status} />
      <span className="text-nyx-100 min-w-0 flex-1 truncate text-body">
        {project.name}
      </span>
      <PriorityBadge priority={project.priority} />
      <TargetBadge target={project.target as string | null} />
      <DueBadge due={project.due} status={project.status} />
      {Boolean(taskCount) && (
        <span className="text-nyx-600 shrink-0 text-caption">
          {sectionCount} section{sectionCount === 1 ? '' : 's'} · {taskCount} task
          {taskCount === 1 ? '' : 's'}
        </span>
      )}
    </button>
  );
}
