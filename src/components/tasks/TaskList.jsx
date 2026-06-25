import { useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { StatusBadge, PriorityBadge, EmptyState, DueBadge } from '../common/ui';
import { minutesToHuman } from '../../lib/dateUtils';
import { ListTodo } from 'lucide-react';

const SORTERS = {
  due: (a, b) =>
    new Date(a.due || 8640000000000000) - new Date(b.due || 8640000000000000),
  priority: (a, b) => priorityRank(a.priority) - priorityRank(b.priority),
  name: (a, b) => a.name.localeCompare(b.name),
};

function priorityRank(p) {
  return { urgent: 0, high: 1, medium: 2, low: 3 }[p] ?? 4;
}

export default function TaskList({
  tasks,
  projectsById,
  sectionsById,
  onOpenTask,
}) {
  const [sortKey, setSortKey] = useState('due');

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
      <div className="border-ink-700 bg-ink-800 text-ink-500 flex items-center gap-2 border-b px-3 py-2 text-xs">
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
      <div className="divide-ink-700 divide-y">
        {sorted.map((task) => {
          const section = sectionsById.get(task.section_id);
          const project = section ? projectsById.get(section.project_id) : null;
          return (
            <button
              key={task.id}
              onClick={() => onOpenTask(task)}
              className="hover:bg-ink-800/60 flex w-full items-center gap-3 px-3.5 py-2.5 text-left"
            >
              <StatusBadge status={task.status} />
              <span className="text-ink-100 min-w-0 flex-1 truncate text-sm">
                {task.name}
              </span>
              {project && (
                <span className="text-ink-500 hidden max-w-[10rem] shrink-0 truncate text-xs sm:block">
                  {project.name}
                </span>
              )}
              <PriorityBadge priority={task.priority} />
              {task.estimate ? (
                <span className="text-ink-600 hidden shrink-0 font-mono text-xs md:block">
                  {minutesToHuman(task.estimate)}
                </span>
              ) : null}
              <DueBadge due={task.due} status={task.status} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
