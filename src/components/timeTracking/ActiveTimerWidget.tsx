import { useEffect, useState } from 'react';
import { Square } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useActiveTimer, useTimerMutations } from '../../hooks/useTimeTracking';
import { useTasks } from '../../hooks/useHierarchy';
import { parseRange } from '../../lib/range';
import { liveStopwatch } from '../../lib/dateUtils';

export default function ActiveTimerWidget() {
  const { data: activeLog } = useActiveTimer();
  const { data: tasks = [] } = useTasks();
  const { stop } = useTimerMutations();
  const [, forceTick] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!activeLog) return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [activeLog]);

  if (!activeLog) {
    return (
      <div className="border-ink-700 text-ink-500 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs">
        <span className="bg-ink-600 h-1.5 w-1.5 shrink-0 rounded-full" />
        Not logging
      </div>
    );
  }

  const { start } = parseRange(activeLog.duration);
  // getActive() only ever returns a row whose range is still open (see
  // timeTrackingApi.getActive / isOpenRange), which guarantees a start.
  if (!start) return null;
  const task = tasks.find((t) => t.id === activeLog.task_id);

  return (
    <button
      onClick={() => task && navigate(`/tasks?taskId=${task.id}`)}
      className="group border-copper-500/40 bg-copper-500/10 hover:bg-copper-500/15 flex items-center gap-2.5 rounded-full border py-1.5 pr-1.5 pl-3 text-xs transition-colors"
      title="Go to running task"
    >
      <span className="bg-copper-500 h-1.5 w-1.5 animate-pulse rounded-full" />
      <span className="text-ink-100 max-w-56 truncate font-medium">
        {task?.name || 'Untitled task'}
      </span>
      <span className="tabular text-copper-400 font-mono">
        {liveStopwatch(start)}
      </span>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          stop.mutate();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.stopPropagation();
            stop.mutate();
          }
        }}
        aria-label="Stop timer"
        className="bg-ink-900 text-ink-300 hover:bg-rust-500/20 hover:text-rust-500 flex h-6 w-6 items-center justify-center rounded-full"
      >
        <Square size={11} fill="currentColor" />
      </span>
    </button>
  );
}
