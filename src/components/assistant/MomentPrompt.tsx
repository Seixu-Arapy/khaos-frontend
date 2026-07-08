import React from 'react';
import {
  MessageSquarePlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { Status, Priority } from '../../lib/types';
import { StatusBadge, PriorityBadge } from '../common/ui';
import { formatDueCompact, minutesToHuman } from '../../lib/dateUtils';
import clsx from 'clsx';

interface ChangeItem {
  label: string;
  from?: unknown;
  to?: unknown;
}

interface ChatMomentPromptProps {
  entityName?: string;
  changes: ChangeItem[];
  status: 'pending' | 'saving' | 'saved' | 'error';
  savedNote?: string;
}

function ChangeChip({ change }: { change: ChangeItem }) {
  const isStatus = change.label === 'status';
  const isPriority = change.label === 'priority';
  const isDue = change.label === 'due date';
  const isEstimate = change.label === 'estimate';

  if (isStatus || isPriority) {
    return (
      <span className="bg-ink-900 border-ink-700 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs">
        {change.from != null && (
          <>
            {isStatus ? (
              <StatusBadge status={change.from as Status} size="sm" />
            ) : (
              <PriorityBadge priority={change.from as Priority} size="sm" />
            )}
            <span className="text-ink-600">→</span>
          </>
        )}
        {isStatus ? (
          <StatusBadge status={change.to as Status} size="sm" />
        ) : (
          <PriorityBadge priority={change.to as Priority} size="sm" />
        )}
      </span>
    );
  }

  if (isDue) {
    const parts = change.to ? formatDueCompact(change.to as string) : null;
    return (
      <span className="bg-ink-900 text-ink-300 border-ink-700 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs">
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

  if (isEstimate) {
    return (
      <span className="bg-ink-900 text-ink-300 border-ink-700 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs">
        <span className="text-ink-500">estimate</span>
        <span className="text-ink-100 font-mono font-medium">
          {change.to != null ? minutesToHuman(Number(change.to)) : '—'}
        </span>
      </span>
    );
  }

  return (
    <span className="bg-ink-900 text-ink-300 border-ink-700 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
      <span className="text-ink-500">{change.label}</span>
      {change.from != null && (
        <>
          <span className="text-ink-600 line-through">
            {String(change.from)}
          </span>
          <span className="text-ink-600">→</span>
        </>
      )}
      <span className="font-medium text-amber-400">{String(change.to)}</span>
    </span>
  );
}

export default function ChatMomentPrompt({
  entityName,
  changes,
  status,
  savedNote,
}: ChatMomentPromptProps) {
  const isPending = status === 'pending';
  const isSaving = status === 'saving';
  const isSaved = status === 'saved';
  const hasError = status === 'error';

  return (
    <div className="my-2 flex gap-2.5 transition-all duration-300">
      <div
        className={clsx(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-300',
          isSaved && 'bg-emerald-500/20 text-emerald-400',
          hasError && 'bg-rose-500/20 text-rose-400',
          (isPending || isSaving) && 'bg-copper-500/15 text-copper-400'
        )}
      >
        {isSaved && <CheckCircle2 size={15} />}
        {hasError && <AlertCircle size={15} />}
        {(isPending || isSaving) && <MessageSquarePlus size={14} />}
      </div>

      <div
        className={clsx(
          'w-full max-w-[85%] rounded-lg border p-3.5 text-sm leading-relaxed shadow-md transition-all duration-300',
          isSaved && 'text-ink-300 border-emerald-500/20 bg-emerald-950/10',
          hasError && 'border-rose-500/30 bg-rose-950/20 text-rose-300',
          (isPending || isSaving) && 'bg-ink-800 border-ink-700 text-ink-200'
        )}
      >
        <div
          className={clsx(
            'mb-1.5 flex items-center justify-between text-xs font-medium',
            isSaved && 'text-emerald-500',
            hasError && 'text-rose-400',
            (isPending || isSaving) && 'text-copper-400'
          )}
        >
          <span>Context Log: {entityName || 'Change'}</span>
          {isSaving && (
            <Loader2 size={12} className="text-ink-500 animate-spin" />
          )}
        </div>

        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {changes.map((change) => (
            <ChangeChip key={change.label} change={change} />
          ))}
        </div>

        {isSaved && savedNote && (
          <div className="text-ink-400 my-2 border-l-2 border-emerald-500/30 pl-2 text-xs italic">
            "{savedNote}"
          </div>
        )}

        <p
          className={clsx(
            'text-xs transition-colors',
            isSaved && 'font-medium text-emerald-500/80',
            hasError && 'font-medium text-rose-400',
            (isPending || isSaving) && 'text-ink-400'
          )}
        >
          {isSaved && 'Context saved to moment.'}
          {hasError &&
            'Failed to save context. Text restored to input. Try again.'}
          {(isPending || isSaving) && 'Why did you make this modification?'}
        </p>
      </div>
    </div>
  );
}
