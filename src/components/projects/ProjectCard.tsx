import { useNavigate } from 'react-router-dom';
import { StatusBadge, PriorityBadge, DueBadge, FieldBadge } from '../common/ui';
import type { Project } from '../../lib/types';

interface ProjectCardProps {
  project: Project;
  fieldName?: string | null;
  sectionCount?: number;
  taskCount?: number;
  doneCount?: number;
}

export default function ProjectCard({
  project,
  fieldName,
  sectionCount,
  taskCount,
  doneCount,
}: ProjectCardProps) {
  const navigate = useNavigate();
  const pct = taskCount ? Math.round(((doneCount ?? 0) / taskCount) * 100) : 0;

  return (
    <button
      onClick={() => navigate(`/projects/${project.id}`)}
      className="border-ink-700 bg-ink-800/40 hover:border-ink-600 hover:bg-ink-800 flex flex-col gap-2.5 rounded-lg border p-4 text-left transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-ink-100 font-medium">{project.name}</h3>
        <div className="flex shrink-0 items-center gap-1.5">
          <FieldBadge fieldName={fieldName} />
          <PriorityBadge priority={project.priority} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={project.status} />
        <DueBadge due={project.due} status={project.status} />
      </div>
      <div className="text-ink-500 text-xs">
        {sectionCount} section{sectionCount === 1 ? '' : 's'} · {taskCount} task
        {taskCount === 1 ? '' : 's'}
      </div>
      {Boolean(taskCount) && (
        <div className="bg-ink-700 h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="bg-sage-500 h-full rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </button>
  );
}
