import { useEffect, useState } from 'react';
import { CalendarRange, X } from 'lucide-react';
import { TextInput } from './ui';
import { parseRange, formatRange } from '../../lib/range';
import {
  toDatetimeLocalValue,
  fromDatetimeLocalValue,
} from '../../lib/dateUtils';

interface TargetEditorProps {
  value?: string | null;
  due?: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
}

// Mirrors the DB's chk_target_valid constraint client-side, so an invalid
// combination shows an inline error instead of round-tripping to Postgres
// and back as a generic error.
function validate(start: Date | null, end: Date | null, due?: string | null) {
  if (!start) return 'Target window needs a start date.';
  if (due) {
    const dueDate = new Date(due);
    if (start >= dueDate) return 'Start must be before the due date.';
    if (end && end > dueDate) return 'End must be on or before the due date.';
  }
  return null;
}

/**
 * Inline editor for the `target` tstzrange column shared by tasks,
 * sections, and projects. Unlike `due` (a hard deadline), target is an
 * optional planning window — it may be absent, open-ended (start only), or
 * bounded (start + end) — but it must always resolve before `due`.
 *
 * Each field commits independently (matching the rest of the detail forms,
 * e.g. TaskDetailModal's due/estimate inputs), and only calls onChange when
 * the resulting range is valid — an invalid combination shows an inline
 * error instead of persisting bad data.
 */
export default function TargetEditor({
  value,
  due,
  onChange,
  disabled,
}: TargetEditorProps) {
  const { start, end } = parseRange(value ?? null);
  const [error, setError] = useState<string | null>(null);
  // Lets the user reveal the "end" input before an end date is actually
  // chosen, without prematurely writing anything to the DB.
  const [forceShowEnd, setForceShowEnd] = useState(false);

  useEffect(() => {
    setForceShowEnd(false);
  }, [value]);

  const showEnd = Boolean(end) || forceShowEnd;

  function commit(nextStart: Date | null, nextEnd: Date | null) {
    if (!nextStart) {
      setError(null);
      onChange(null);
      return;
    }
    const problem = validate(nextStart, nextEnd, due);
    setError(problem);
    if (problem) return;
    onChange(formatRange(nextStart, nextEnd || null));
  }

  function handleStartChange(e: React.ChangeEvent<HTMLInputElement>) {
    const nextStart = e.target.value
      ? fromDatetimeLocalValue(e.target.value)
      : null;
    commit(nextStart, end);
  }

  function handleEndChange(e: React.ChangeEvent<HTMLInputElement>) {
    const nextEnd = e.target.value
      ? fromDatetimeLocalValue(e.target.value)
      : null;
    commit(start, nextEnd);
  }

  function handleNoEndToggle(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      setForceShowEnd(false);
      commit(start, null);
    } else {
      // User wants to add an end date — just reveal the input, don't
      // persist anything until they actually pick a date.
      setForceShowEnd(true);
    }
  }

  function handleClear() {
    setError(null);
    setForceShowEnd(false);
    onChange(null);
  }

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <CalendarRange size={13} className="text-ink-500 shrink-0" />
        <TextInput
          type="datetime-local"
          value={toDatetimeLocalValue(start)}
          onChange={handleStartChange}
          disabled={disabled}
          className="flex-1"
        />
        {showEnd ? (
          <TextInput
            type="datetime-local"
            value={toDatetimeLocalValue(end)}
            onChange={handleEndChange}
            disabled={disabled}
            className="flex-1"
          />
        ) : (
          <span className="text-ink-600 shrink-0 text-xs">open-ended</span>
        )}
        {(start || end) && (
          <button
            type="button"
            onClick={handleClear}
            className="text-ink-500 hover:text-rust-500 shrink-0"
            aria-label="Clear target window"
            title="Clear target window"
          >
            <X size={13} />
          </button>
        )}
      </div>
      {Boolean(start) && (
        <label className="text-ink-500 mt-1.5 flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={!showEnd}
            onChange={handleNoEndToggle}
            className="border-ink-600 bg-ink-800 accent-copper-500 h-3.5 w-3.5 rounded"
          />
          No end date yet
        </label>
      )}
      {error && <p className="text-rust-500 mt-1 text-xs">{error}</p>}
    </div>
  );
}
