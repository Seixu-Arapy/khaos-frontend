import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { X, MessageSquarePlus, Target, BookOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { momentsApi } from '../../lib/api/moments';
import { supabase } from '../../lib/supabaseClient';
import type { EntityRef } from '../../lib/api/moments';
import type { Status, Priority } from '../../lib/types';
import { StatusBadge, PriorityBadge } from './ui';
import { formatDueCompact, minutesToHuman } from '../../lib/dateUtils';

interface ChangeItem {
  label: string;
  from?: unknown;
  to?: unknown;
}

interface MomentPromptType {
  id: string;
  entityRef: EntityRef;
  entityName?: string;
  changes: ChangeItem[];
}

interface MomentPromptProps {
  prompt: MomentPromptType | null;
  onDismiss: () => void;
}

interface ExtraMomentType {
  type: 'target' | 'definition';
  label: string;
  icon: LucideIcon;
  description: string;
  inputType: 'date' | 'text';
  placeholder: string | null;
}

const EXTRA_MOMENT_TYPES: ExtraMomentType[] = [
  {
    type: 'target',
    label: 'Set a target',
    icon: Target,
    description:
      'Your personal goal date — when you want it done, not when it must be done.',
    inputType: 'date',
    placeholder: null,
  },
  {
    type: 'definition',
    label: 'Define the work',
    icon: BookOpen,
    description:
      'What kind of work is this? What does "done" mean conceptually? (Used for future analysis, not day-to-day tracking.)',
    inputType: 'text',
    placeholder:
      'e.g. "Creative research — done when the hypothesis is validated, not when a deliverable ships."',
  },
];

// Renders a compact badge for a single field change. Falls back to the
// original plain-text chip for fields we don't have a dedicated visual for.
function ChangeChip({ change }: { change: ChangeItem }) {
  const isStatus = change.label === 'status';
  const isPriority = change.label === 'priority';
  const isDue = change.label === 'due date';
  const isEstimate = change.label === 'estimate';

  if (isStatus || isPriority) {
    return (
      <span className="bg-ink-700 inline-flex items-center gap-1.5 rounded-full px-2 py-1">
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
      <span className="bg-ink-700 text-ink-300 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs">
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
      <span className="bg-ink-700 text-ink-300 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs">
        <span className="text-ink-500">estimate</span>
        <span className="text-ink-100 font-mono font-medium">
          {change.to != null ? minutesToHuman(Number(change.to)) : '—'}
        </span>
      </span>
    );
  }

  return (
    <span className="bg-ink-700 text-ink-300 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs">
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

export default function MomentPrompt({ prompt, onDismiss }: MomentPromptProps) {
  const [note, setNote] = useState<string>('');
  const [extraType, setExtraType] = useState<'target' | 'definition' | null>(
    null
  );
  const [extraValue, setExtraValue] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Esc closes/skips the prompt — but never while a save is in flight, so a
  // stray Esc can't abandon a write that's already been kicked off.
  useEffect(() => {
    if (!prompt) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) onDismiss();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [prompt, saving, onDismiss]);

  // AppShell only mounts this component when a prompt is queued, but the
  // guard is kept for safety in case that contract changes.
  if (!prompt) return null;

  const activePrompt = prompt;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    if (e) e.preventDefault();

    if (saving || (!note.trim() && !extraValue.trim())) return;

    setSaving(true);
    setError(null);
    try {
      const saves: Promise<unknown | void>[] = [];

      if (note.trim()) {
        saves.push(
          momentsApi.attachNoteToLatestChange(
            activePrompt.entityRef,
            note.trim()
          )
        );
      }

      if (extraType && extraValue.trim()) {
        const insertPromise = (async () => {
          const { error: insertError } = await supabase.from('moments').insert({
            ...activePrompt.entityRef,
            moment_type: extraType,
            value: extraType === 'target' ? extraValue : null,
            moment_note: extraType === 'definition' ? extraValue.trim() : null,
          });

          if (insertError) throw insertError;
        })();

        saves.push(insertPromise);
      }

      await Promise.all(saves);
      onDismiss();
    } catch (err) {
      console.error('Erro ao guardar o momento:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong saving this — try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  const activeMeta = EXTRA_MOMENT_TYPES.find((m) => m.type === extraType);

  return (
    <form
      onSubmit={handleSubmit}
      className="border-ink-700 bg-ink-800 text-ink-50 fixed right-4 bottom-4 z-50 w-80 rounded-xl border p-1 shadow-2xl"
    >
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="text-copper-400 h-4 w-4" />
          <span className="text-xs font-medium tracking-tight">
            Add context to {activePrompt.entityName || 'change'}
          </span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-ink-500 hover:text-ink-300 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 px-3.5 pb-2.5">
        {activePrompt.changes.map((change) => (
          <ChangeChip key={change.label} change={change} />
        ))}
      </div>

      <div className="px-2">
        <input
          type="text"
          autoFocus
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setError(null);
          }}
          placeholder="Why did this change? (Optional)"
          disabled={saving}
          className="border-ink-800 bg-ink-900 text-ink-100 placeholder:text-ink-600 focus:border-copper-500 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-1 p-2">
        {EXTRA_MOMENT_TYPES.map((meta) => {
          const Icon = meta.icon;
          const isSelected = extraType === meta.type;
          return (
            <button
              key={meta.type}
              type="button"
              onClick={() => {
                setExtraType(isSelected ? null : meta.type);
                setError(null);
              }}
              className={clsx(
                'hover:bg-ink-800 flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors',
                isSelected ? 'bg-ink-800 text-copper-400' : 'text-ink-400'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {meta.label}
            </button>
          );
        })}
      </div>

      {activeMeta && (
        <div className="border-ink-900 bg-ink-900/50 border-t p-3">
          <p className="text-ink-400 mb-2 text-[11px] leading-relaxed">
            {activeMeta.description}
          </p>
          <input
            type={activeMeta.inputType === 'date' ? 'date' : 'text'}
            autoFocus
            value={extraValue}
            onChange={(e) => {
              setExtraValue(e.target.value);
              setError(null);
            }}
            placeholder={activeMeta.placeholder || undefined}
            className="border-ink-600 bg-ink-900 text-ink-100 placeholder:text-ink-600 focus:border-copper-400 w-full rounded border px-2.5 py-2 text-sm focus:outline-none"
          />
        </div>
      )}

      {error && (
        <p className="text-rust-500 px-3.5 pb-1 text-xs leading-relaxed">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 px-3.5 py-3">
        <button
          type="button"
          onClick={onDismiss}
          className="text-ink-500 hover:text-ink-300 text-xs"
        >
          Skip
        </button>
        <button
          type="submit"
          disabled={saving || (!note.trim() && !extraValue.trim())}
          className="bg-copper-500 text-ink-950 hover:bg-copper-400 disabled:bg-ink-800 disabled:text-ink-600 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
