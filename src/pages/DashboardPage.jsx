import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isToday } from 'date-fns';
import { AlertTriangle, CalendarClock, CheckCircle2 } from 'lucide-react';
import { useTasks, useSections, useProjects } from '../hooks/useHierarchy';
import { useEvents } from '../hooks/useEvents';
import { OPEN_STATUSES } from '../lib/constants';
import { isOverdue } from '../lib/dateUtils';
import { parseRange } from '../lib/range';
import { EmptyState } from '../components/common/ui';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import TaskRow from '../components/tasks/TaskRow';

export default function DashboardPage() {
  const { data: tasks = [] } = useTasks();
  const { data: sections = [] } = useSections();
  const { data: projects = [] } = useProjects();
  const { data: events = [] } = useEvents();
  const [searchParams, setSearchParams] = useSearchParams();

  const sectionsById = useMemo(
    () => new Map(sections.map((s) => [s.id, s])),
    [sections]
  );
  const projectsById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  const openTasks = tasks.filter((t) => OPEN_STATUSES.includes(t.status));
  const overdue = openTasks.filter((t) => isOverdue(t.due, t.status));
  const dueToday = openTasks.filter(
    (t) => t.due && isToday(new Date(t.due)) && !isOverdue(t.due, t.status)
  );
  const todaysEvents = events
    .map((e) => ({ ...e, ...parseRange(e.duration) }))
    .filter((e) => e.start && isToday(e.start))
    .sort((a, b) => a.start - b.start);

  const openTaskId = searchParams.get('taskId');
  const openTask = openTaskId
    ? tasks.find((t) => t.id === Number(openTaskId))
    : null;
  function openTask_(task) {
    setSearchParams({ taskId: String(task.id) });
  }
  function closeTask() {
    searchParams.delete('taskId');
    setSearchParams(searchParams);
  }

  function projectLabel(task) {
    const section = sectionsById.get(task.section_id);
    return section ? projectsById.get(section.project_id)?.name : null;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-5">
      <h1 className="font-display text-ink-100 mb-1 text-2xl">Today</h1>
      <p className="text-ink-500 mb-6 text-sm">
        {new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
      </p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section>
          <h2 className="text-rust-500 mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
            <AlertTriangle size={13} /> Overdue ({overdue.length})
          </h2>
          {!overdue.length ? (
            <p className="text-ink-600 text-sm">Nothing overdue. Good work.</p>
          ) : (
            <div className="space-y-1">
              {overdue.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  project={projectLabel(task)}
                  onOpen={openTask_}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-copper-400 mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
            <CheckCircle2 size={13} /> Due today ({dueToday.length})
          </h2>
          {!dueToday.length ? (
            <p className="text-ink-600 text-sm">Nothing due today.</p>
          ) : (
            <div className="space-y-1">
              {dueToday.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  project={projectLabel(task)}
                  onOpen={openTask_}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-teal-400 uppercase">
          <CalendarClock size={13} /> Today&lsquo;s calendar
        </h2>
        {!todaysEvents.length ? (
          <EmptyState
            icon={CalendarClock}
            title="Nothing on the calendar today"
          />
        ) : (
          <div className="divide-ink-700 border-ink-700 divide-y rounded-lg border">
            {todaysEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-3 px-3.5 py-2.5"
              >
                <span className="text-ink-400 w-20 shrink-0 font-mono text-xs">
                  {ev.start.toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
                <span className="text-ink-100 text-sm">{ev.name}</span>
                <span className="text-ink-600 ml-auto text-xs">
                  {ev.event_type}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {openTask && (
        <TaskDetailModal
          taskId={openTask.id}
          task={openTask}
          onClose={closeTask}
        />
      )}
    </div>
  );
}
