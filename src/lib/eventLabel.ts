import type { Event } from './types';

/**
 * Computes the display label for a calendar event.
 *
 * Rules:
 *   - blank title, linked task           -> task's name alone
 *   - title present, no linked task      -> the title
 *   - title present, differs from task   -> "Title — Task name"
 *   - title present, equals task's name  -> just the name (avoids the
 *     redundant "Task — Task" when EventModal auto-filled the title from
 *     the linked task because it was left blank)
 */
export function getEventLabel(
  event: Pick<Event, 'name'>,
  taskName?: string | null
): string {
  const name = event?.name?.trim();
  if (!name) return taskName || 'Untitled event';
  if (taskName && name === taskName) return name;
  if (taskName) return `${name} — ${taskName}`;
  return name;
}
