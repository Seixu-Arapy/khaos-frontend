import { format } from 'date-fns';
import { parseRange } from '../../lib/range';
import { EVENT_TYPE_META } from '../../lib/constants';
import { getEventLabel } from '../../lib/eventLabel';
import { ProjectChip, TaskProgressBar } from '../common/ui';
import type { TaskProgress } from '../../lib/taskProgress';
import type { Event } from '../../lib/types';

interface InlineEventPreviewProps {
  event: Event;
  taskName?: string | null;
  projectName?: string | null;
  projectField?: string | null;
  progress?: TaskProgress | null;
}

// Chat-mention counterpart to the calendar's own event blocks — same
// left-border accent per event_type, project row, and progress meter, so
// the two surfaces read as one visual language.
export function InlineEventPreview({
  event,
  taskName,
  projectName,
  projectField,
  progress,
}: InlineEventPreviewProps) {
  const { start, end } = parseRange(event.duration as unknown as string);
  const meta = EVENT_TYPE_META[event.event_type] || EVENT_TYPE_META.scheduled;
  const label = getEventLabel(event, taskName);

  return (
    <div
      className={`bg-ink-900 border-ink-700 rounded-md border border-l-4 px-2.5 py-2 ${meta.border} ${meta.borderStyle}`}
    >
      <div className="grid grid-cols-[38px_1fr] items-baseline gap-x-2 gap-y-0.5">
        {start && (
          <span className="text-ink-300 col-start-1 row-start-1 font-mono text-[11px] leading-tight">
            {format(start, 'h:mmaaaaa')}
          </span>
        )}
        <div className="col-start-2 row-start-1 flex min-w-0 items-baseline gap-1.5">
          <span className="text-ink-100 min-w-0 flex-1 truncate text-sm">
            {label}
          </span>
          <span className="text-ink-600 shrink-0 font-mono text-[9px] tracking-wide uppercase">
            event
          </span>
        </div>
        {end && (
          <span className="text-ink-600 col-start-1 row-start-2 font-mono text-[11px] leading-tight">
            {format(end, 'h:mmaaaaa')}
          </span>
        )}
        {projectName && (
          <div className="col-start-2 row-start-2">
            <ProjectChip name={projectName} fieldName={projectField} />
          </div>
        )}
        {progress && (
          <div className="col-span-2 row-start-3 mt-1">
            <TaskProgressBar progress={progress} />
          </div>
        )}
      </div>
    </div>
  );
}
