import { useMemo, useState } from 'react';
import { ArrowUpDown, ListTodo } from 'lucide-react';
import { EmptyState } from '../common/ui';
import type { Task, Id } from '../../lib/types';
import TaskRow from './TaskRow';

type SortKey = 'due' | 'priority' | 'name';

const SORTERS: Record<SortKey, (a: Task, b: Task) => number> = {
  due: (a, b) =>
    new Date(a.due ?? 8640000000000000).getTime() -
    new Date(b.due ?? 8640000000000000).getTime(),
  priority: (a, b) => priorityRank(a.priority) - priorityRank(b.priority),
  name: (a, b) => a.name.localeCompare(b.name),
};

function priorityRank(p: Task['priority']) {
  return { urgent: 0, high: 1, medium: 2, low: 3 }[p ?? 'medium'] ?? 4;
}

export interface ProjectInfo {
  name: string | null;
  fieldName: string | null;
}

interface TaskListProps {
  tasks: Task[];
  projectInfoById: Map<Id, ProjectInfo>;
  onOpenTask: (task: Task) => void;
}

export default function TaskList({
  tasks,
  projectInfoById,
  onOpenTask,
}: TaskListProps) {
  const [sortKey, setSortKey] = useState<SortKey>('due');

  const sorted = useMemo(
    () => [...tasks].sort(SORTERS[sortKey]),
    [tasks, sortKey]
  );

  if (!tasks.length) {
    return (
      <EmptyState
        icon={ListTodo}
        title="No tasks here"
        hint="Try adjusting your filters, or quick-add a new task above."
      />
    );
  }

  return (
    <div className="border-ink-700 overflow-hidden rounded-lg border">
      <div className="border-ink-700 bg-ink-800 text-ink-500 flex items-center gap-2 border-b px-3 py-2 text-caption">
        <button
          onClick={() => setSortKey('due')}
          className="hover:text-ink-200 flex items-center gap-1"
        >
          Sort by due <ArrowUpDown size={11} />
        </button>
        <button
          onClick={() => setSortKey('priority')}
          className="hover:text-ink-200 flex items-center gap-1"
        >
          Priority <ArrowUpDown size={11} />
        </button>
        <button
          onClick={() => setSortKey('name')}
          className="hover:text-ink-200 flex items-center gap-1"
        >
          Name <ArrowUpDown size={11} />
        </button>
      </div>
      <div className="divide-ink-700 divide-y p-1">
        {sorted.map((task) => {
          const info = projectInfoById.get(task.id);
          return (
            <TaskRow
              key={task.id}
              task={task}
              onOpen={onOpenTask}
              projectName={info?.name}
              projectField={info?.fieldName}
            />
          );
        })}
      </div>
    </div>
  );
}
