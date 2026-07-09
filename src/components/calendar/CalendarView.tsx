import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, format, isToday, startOfWeek } from 'date-fns';
import { parseRange } from '../../lib/range';
import { EVENT_TYPE_META } from '../../lib/constants';
import { getTimezone } from '../../lib/timezone';
import { getEventLabel } from '../../lib/eventLabel';
import { ProjectChip, TaskProgressBar } from '../common/ui';
import { computeTaskProgress, type TaskProgress } from '../../lib/taskProgress';
import type { Event, Task, Project, Field, TaskLog } from '../../lib/types';

const HOUR_HEIGHT = 48; // px
const DAY_HEIGHT = HOUR_HEIGHT * 24;

type PositionedEvent = Event & {
  start: Date;
  end: Date;
  label: string;
  projectName: string | null;
  projectField: string | null;
  progress: TaskProgress | null;
};

// Ticks once a minute so the current-time line drifts without re-deriving
// the whole calendar on every render.
function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function minutesFromMidnight(date: Date): number {
  const tz = getTimezone();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

interface CalendarViewProps {
  events: Event[];
  tasks?: Task[];
  projects?: Project[];
  fields?: Field[];
  taskLogs?: TaskLog[];
  onSlotClick: (date: Date) => void;
  onEventClick: (event: Event) => void;
}

export default function CalendarView({
  events,
  tasks = [],
  projects = [],
  fields = [],
  taskLogs = [],
  onSlotClick,
  onEventClick,
}: CalendarViewProps) {
  const [anchor, setAnchor] = useState(new Date());
  const now = useNow();
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const tasksById = useMemo(
    () => new Map(tasks.map((t) => [t.id, t])),
    [tasks]
  );
  const projectsById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );
  const fieldsById = useMemo(
    () => new Map(fields.map((f) => [f.id, f])),
    [fields]
  );
  const logsByTask = useMemo(() => {
    const map = new Map<string, TaskLog[]>();
    for (const log of taskLogs) {
      if (!log.task_id) continue;
      if (!map.has(log.task_id)) map.set(log.task_id, []);
      map.get(log.task_id)!.push(log);
    }
    return map;
  }, [taskLogs]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, PositionedEvent[]>(
      days.map((d) => [format(d, 'yyyy-MM-dd'), []])
    );
    const tz = getTimezone();
    for (const ev of events) {
      const { start, end } = parseRange(ev.duration as unknown as string);
      if (!start) continue;
      // Bucket by the wall-clock date in the user's timezone
      const key = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(
        start
      ); // "YYYY-MM-DD"
      const task = ev.task_id ? tasksById.get(ev.task_id) : null;
      const project = ev.project_id ? projectsById.get(ev.project_id) : null;
      const projectField = project?.field_id
        ? (fieldsById.get(project.field_id)?.name ?? null)
        : null;
      const progress = task
        ? computeTaskProgress(task, logsByTask.get(task.id) ?? [])
        : null;
      if (map.has(key))
        map.get(key)!.push({
          ...ev,
          start,
          end: end || new Date(start.getTime() + 30 * 60000),
          label: getEventLabel(ev, task?.name),
          projectName: project?.name ?? null,
          projectField,
          progress,
        });
    }
    return map;
  }, [events, days, tasksById, projectsById, fieldsById, logsByTask]);

  function handleColumnClick(day: Date, e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return; // ignore clicks on event blocks (they stop propagation)
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const hour = Math.max(0, Math.min(23, Math.floor(offsetY / HOUR_HEIGHT)));
    const slotDate = new Date(day);
    slotDate.setHours(hour, 0, 0, 0);
    onSlotClick(slotDate);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => setAnchor(addDays(anchor, -7))}
          className="text-ink-400 hover:bg-ink-800 rounded p-1"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => setAnchor(addDays(anchor, 7))}
          className="text-ink-400 hover:bg-ink-800 rounded p-1"
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={() => setAnchor(new Date())}
          className="border-ink-700 text-ink-300 hover:bg-ink-800 rounded border px-2 py-0.5 text-xs"
        >
          Today
        </button>
        <span className="text-ink-300 ml-2 text-sm">
          {format(weekStart, 'MMM d')} –{' '}
          {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </span>
      </div>

      <div className="border-ink-700 flex-1 overflow-y-auto rounded-lg border">
        <div className="border-ink-700 bg-ink-900 sticky top-0 z-10 grid grid-cols-[48px_repeat(7,1fr)] border-b">
          <div />
          {days.map((d) => (
            <div
              key={d.toISOString()}
              className={`border-ink-700 border-l px-1.5 py-2 text-center ${isToday(d) ? 'bg-copper-500/10' : ''}`}
            >
              <p className="text-ink-500 text-[11px] tracking-wide uppercase">
                {format(d, 'EEE')}
              </p>
              <p
                className={`text-sm font-medium ${isToday(d) ? 'text-copper-400' : 'text-ink-200'}`}
              >
                {format(d, 'd')}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[48px_repeat(7,1fr)]">
          <div style={{ height: DAY_HEIGHT }} className="relative">
            {Array.from({ length: 24 }).map((_, h) => (
              <div
                key={h}
                style={{ top: h * HOUR_HEIGHT }}
                className="text-ink-600 absolute right-1.5 -translate-y-2 text-[10px]"
              >
                {h === 0
                  ? ''
                  : `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'a' : 'p'}`}
              </div>
            ))}
          </div>
          {days.map((day) => {
            const dayEvents = eventsByDay.get(format(day, 'yyyy-MM-dd')) || [];
            const todayColumn = isToday(day);
            return (
              <div
                key={day.toISOString()}
                onClick={(e) => handleColumnClick(day, e)}
                style={{ height: DAY_HEIGHT }}
                className={`border-ink-700 relative cursor-pointer border-l ${todayColumn ? 'bg-copper-500/5' : ''}`}
              >
                {Array.from({ length: 24 }).map((_, h) => (
                  <div
                    key={h}
                    style={{ top: h * HOUR_HEIGHT }}
                    className="bg-ink-800 pointer-events-none absolute h-px w-full"
                  />
                ))}
                {todayColumn && (
                  <div
                    style={{ top: (minutesFromMidnight(now) / 60) * HOUR_HEIGHT }}
                    className="pointer-events-none absolute z-20 h-0.5 w-full bg-copper-400"
                  >
                    <span className="bg-copper-400 absolute top-1/2 -left-1 h-2 w-2 -translate-y-1/2 rounded-full" />
                  </div>
                )}
                {dayEvents.map((ev) => {
                  const top =
                    (minutesFromMidnight(ev.start) / 60) * HOUR_HEIGHT;
                  const height = Math.max(
                    18,
                    ((ev.end.getTime() - ev.start.getTime()) / 60000 / 60) *
                      HOUR_HEIGHT
                  );
                  const meta =
                    EVENT_TYPE_META[ev.event_type] || EVENT_TYPE_META.scheduled;
                  return (
                    <button
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(ev);
                      }}
                      style={{ top, height }}
                      className={`absolute right-1 left-1 flex flex-col overflow-hidden rounded border-l-2 px-1.5 py-0.5 text-left text-[11px] leading-tight ${meta.bg} ${meta.text}`}
                    >
                      <span className="shrink-0 truncate font-medium">
                        {ev.label}
                      </span>
                      {ev.projectName && (
                        <ProjectChip
                          name={ev.projectName}
                          fieldName={ev.projectField}
                          className="mt-0.5 shrink-0"
                        />
                      )}
                      {ev.progress && (
                        <TaskProgressBar
                          progress={ev.progress}
                          className="mt-0.5 shrink-0"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
