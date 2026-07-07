import { useNavigate } from 'react-router-dom';
import { useTasks, useProjects } from '../../hooks/useHierarchy';
import { InlineEntityPreview } from './InlineEntityPreview';
import type { ChatEntityType } from '../../lib/gemini/entityRefs';
import type { Task, Project } from '../../lib/types';

interface EntityChipProps {
  entityType: ChatEntityType;
  id: string;
}

// Resolves a [[task:id]] / [[project:id]] token against whatever's already
// in the React Query cache (both lists are loaded app-wide) and renders it
// as a clickable, formatted chip instead of raw text.
export function EntityChip({ entityType, id }: EntityChipProps) {
  const navigate = useNavigate();
  const { data: tasks = [] } = useTasks() as { data: Task[] };
  const { data: projects = [] } = useProjects() as { data: Project[] };

  const data =
    entityType === 'task'
      ? tasks.find((t) => t.id === id)
      : projects.find((p) => p.id === id);

  if (!data) {
    return (
      <span className="text-ink-600 my-1 block text-xs italic">
        ({entityType} unavailable)
      </span>
    );
  }

  return (
    <button
      onClick={() =>
        navigate(
          entityType === 'task' ? `/tasks?taskId=${id}` : `/projects/${id}`
        )
      }
      className="my-1 block w-full max-w-xs text-left"
    >
      <InlineEntityPreview entityType={entityType} data={data} />
    </button>
  );
}
