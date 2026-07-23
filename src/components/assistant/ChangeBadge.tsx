import { StatusBadge, PriorityBadge } from '../common/ui';
import { formatDueCompact, minutesToHuman } from '../../lib/dateUtils';
import type { FieldChange } from '../../lib/chat/confirmationPreview';
import type { Status, Priority } from '../../lib/types';

// Same visual language as MomentPrompt's ChangeChip, reused for the
// assistant's write-confirmation card.
export function ChangeBadge({ change }: { change: FieldChange }) {
  const { field, label, from, to } = change;

  if (field === 'status' || field === 'priority') {
    return (
      <span className="bg-ink-700 inline-flex items-center gap-1.5 rounded-full px-2 py-1">
        {from != null && (
          <>
            {field === 'status' ? (
              <StatusBadge status={from as Status} size="sm" />
            ) : (
              <PriorityBadge priority={from as Priority} size="sm" />
            )}
            <span className="text-ink-600">→</span>
          </>
        )}
        {field === 'status' ? (
          <StatusBadge status={to as Status} size="sm" />
        ) : (
          <PriorityBadge priority={to as Priority} size="sm" />
        )}
      </span>
    );
  }

  if (field === 'due') {
    const parts = to ? formatDueCompact(to as string) : null;
    return (
      <span className="bg-ink-700 text-ink-300 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-caption">
        <span className="text-ink-500">due</span>
        {parts ? (
          <span className="font-mono tracking-tight">
            <span className="font-bold">{parts.day}</span>
            {parts.month}
          </span>
        ) : (
          <span className="text-ink-500">cleared</span>
        )}
      </span>
    );
  }

  if (field === 'estimate') {
    return (
      <span className="bg-ink-700 text-ink-300 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-caption">
        <span className="text-ink-500">estimate</span>
        <span className="text-ink-100 font-mono font-medium">
          {to != null ? minutesToHuman(Number(to)) : '—'}
        </span>
      </span>
    );
  }

  return (
    <span className="bg-ink-700 text-ink-300 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption">
      <span className="text-ink-500">{label}</span>
      {from != null && (
        <>
          <span className="text-ink-600 line-through">{String(from)}</span>
          <span className="text-ink-600">→</span>
        </>
      )}
      <span className="font-medium text-amber-400">{String(to)}</span>
    </span>
  );
}
