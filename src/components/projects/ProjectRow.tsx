import { useNavigate } from 'react-router-dom';
import { StatusBadge, PriorityBadge, DueBadge, TargetBadge } from '../common/ui';
import type { Project } from '../../lib/types';

interface ProjectRowProps {
  project: Project;
  sectionCount?: number;
  taskCount?: number;
}

// The row-shaped sibling to ProjectCard's grid tile -- for contexts a tile
// doesn't fit (e.g. a projects list view). TaskRow-shaped by design: one
// line, status+name on the left, everything else shrink-wrapped on the
// right, matching how the app already reads a row of work.
export default function ProjectRow({
  project,
  sectionCount,
  taskCount,
}: ProjectRowProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/projects/${project.id}`)}
      className="group hover:border-nyx-700 hover:bg-nyx-900 flex w-full items-center gap-1.5 rounded-md border border-transparent px-2 py-1.5 text-left"
    >
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
