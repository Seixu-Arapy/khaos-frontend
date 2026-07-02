import { useState } from 'react';
import { X, MessageSquarePlus, Target, BookOpen } from 'lucide-react';
import clsx from 'clsx';
import { momentsApi } from '../../lib/api/moments';
import { supabase } from '../../lib/supabaseClient';

const EXTRA_MOMENT_TYPES = [
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
    inputType: 'textarea',
    placeholder:
      'e.g. "Creative research — done when the hypothesis is validated, not when a deliverable ships."',
  },
];

function ChangeChip({ change }) {
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
      <span className="text-ink-100 font-medium">{String(change.to)}</span>
    </span>
  );
}

export default function MomentPrompt({ prompt, onDismiss }) {
  const [note, setNote] = useState('');
  const [extraType, setExtraType] = useState(null);
  const [extraValue, setExtraValue] = useState('');
  const [saving, setSaving] = useState(false);

  if (!prompt) return null;

  async function handleSave() {
    setSaving(true);
    try {
      const saves = [];

      if (note.trim()) {
        saves.push(
          momentsApi.attachNoteToLatestChange(prompt.entityRef, note.trim())
        );
      }

      if (extraType && extraValue.trim()) {
        saves.push(
          supabase.from('moments').insert({
            ...prompt.entityRef,
            moment_type: extraType,
            value: extraType === 'target' ? extraValue : null,
            moment_note: extraType === 'definition' ? extraValue.trim() : null,
          })
        );
      }

      await Promise.all(saves);
    } finally {
      setSaving(false);
      onDismiss();
    }
  }

  const activeMeta = EXTRA_MOMENT_TYPES.find((m) => m.type === extraType);

  return (
    <div className="border-ink-600 bg-ink-800 shadow-panel fixed right-3 bottom-20 z-50 w-[calc(100vw-1.5rem)] max-w-xs rounded-lg border sm:right-5 sm:bottom-5 sm:w-80">
      {/* Header */}
      <div className="border-ink-700 flex items-start justify-between gap-2 border-b px-3.5 py-3">
        <div className="min-w-0">
          <p className="text-ink-200 flex items-center gap-1.5 text-xs font-semibold">
            <MessageSquarePlus size={13} className="text-copper-400 shrink-0" />
            {prompt.entityName}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {prompt.changes.map((c) => (
              <ChangeChip key={c.field} change={c} />
            ))}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-ink-500 hover:text-ink-200 shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* Note input */}
      <div className="px-3.5 pt-3">
        <textarea
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why did this change? (optional)"
          rows={2}
          className="border-ink-600 bg-ink-900 text-ink-100 placeholder:text-ink-600 focus:border-copper-400 w-full resize-none rounded border px-2.5 py-2 text-sm focus:outline-none"
        />
      </div>

      {/* Extra moment buttons */}
      <div className="flex gap-1.5 px-3.5 pt-2">
        {EXTRA_MOMENT_TYPES.map((m) => (
          <button
            key={m.type}
            onClick={() => setExtraType(extraType === m.type ? null : m.type)}
            className={clsx(
              'border-ink-600 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors',
              extraType === m.type
                ? 'border-copper-500/50 bg-copper-500/10 text-copper-400'
                : 'border-ink-600 text-ink-500 hover:border-ink-500 hover:text-ink-300'
            )}
          >
            <m.icon size={10} />
            {m.label}
          </button>
        ))}
      </div>

      {/* Expanded extra input */}
      {activeMeta && (
        <div className="space-y-1.5 px-3.5 pt-2">
          <p className="text-ink-500 text-[11px] leading-relaxed">
            {activeMeta.description}
          </p>
          {activeMeta.inputType === 'date' ? (
            <input
              type="date"
              autoFocus
              value={extraValue}
              onChange={(e) => setExtraValue(e.target.value)}
              className="border-ink-600 bg-ink-900 text-ink-100 focus:border-copper-400 w-full rounded border px-2.5 py-2 text-sm focus:outline-none"
            />
          ) : (
            <textarea
              autoFocus
              value={extraValue}
              onChange={(e) => setExtraValue(e.target.value)}
              placeholder={activeMeta.placeholder}
              rows={3}
              className="border-ink-600 bg-ink-900 text-ink-100 placeholder:text-ink-600 focus:border-copper-400 w-full resize-none rounded border px-2.5 py-2 text-sm focus:outline-none"
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 px-3.5 py-3">
        <button
          onClick={onDismiss}
          className="text-ink-500 hover:text-ink-300 text-xs"
        >
          Skip
        </button>
        <button
          onClick={handleSave}
          disabled={saving || (!note.trim() && !extraValue.trim())}
          className="bg-copper-500 text-ink-900 hover:bg-copper-400 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
