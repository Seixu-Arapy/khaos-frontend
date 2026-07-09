import { rangeDurationMinutes } from './range';
import type { Task, TaskLog } from './types';

export type ProgressLevel = 'ok' | 'warn' | 'over';

export interface TaskProgress {
  loggedMinutes: number;
  estimateMinutes: number;
  pct: number; // uncapped — can exceed 100
  level: ProgressLevel;
}

// null when the task has no estimate — there's nothing to show progress
// against, as opposed to 0% which would be misleading.
export function computeTaskProgress(
  task: Pick<Task, 'estimate'>,
  logs: Pick<TaskLog, 'duration'>[]
): TaskProgress | null {
  if (!task.estimate) return null;
  const loggedMinutes = logs.reduce(
    (sum, log) => sum + rangeDurationMinutes(log.duration as unknown as string),
    0
  );
  const pct = (loggedMinutes / task.estimate) * 100;
  const level: ProgressLevel = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
  return { loggedMinutes, estimateMinutes: task.estimate, pct, level };
}
