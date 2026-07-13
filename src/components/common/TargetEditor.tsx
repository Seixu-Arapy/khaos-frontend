import { useEffect, useMemo, useState } from 'react';
import { Target, X } from 'lucide-react';
import clsx from 'clsx';
import { TextInput, TimeToggle } from './ui';
import { parseRange, formatRange } from '../../lib/range';

interface TargetEditorProps {
  value?: string | null;
  due?: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
  // Suppresses the pill's own clear (X) button — used when the host
  // renders a clear action next to the field's label instead (Task Detail
  // Modal). Other callers (Section/Project) keep the pill's own button
  // since they don't have a label row to put it in.
  hideClear?: boolean;
}

function validate(start: Date | null, end: Date | null, due?: string | null) {
  if (!start) return 'Target window needs a start date.';
  if (due) {
    const dueDate = new Date(due);
    if (start >= dueDate) return 'Start must be before the due date.';
    if (end && end > dueDate) return 'End must be on or before the due date.';
  }
  return null;
}

// Extracts local year, month, day, hour, and minute values without timezone shifts
function getLocalValues(d: Date | null) {
  if (!d || isNaN(d.getTime())) return { date: '', time: '', hasTime: false };
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  // Active time is assumed if it's not exactly midnight (00:00)
  const hasTime = !(hours === '00' && minutes === '00');
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
    hasTime,
  };
}

// Rebuilds the Date object using strictly local context bounds
function buildLocalDate(
  dateStr: string,
  timeStr: string,
  isTimeActive: boolean
): Date | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);
  if (isTimeActive && timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    localDate.setHours(hours, minutes, 0, 0);
  } else {
    localDate.setHours(0, 0, 0, 0);
  }
  return localDate;
}

export default function TargetEditor({
  value,
  due,
  onChange,
  disabled,
  hideClear,
}: TargetEditorProps) {
  const { start, end } = parseRange(value ?? null);
  const [error, setError] = useState<string | null>(null);
  const [forceShowEnd, setForceShowEnd] = useState(false);

  const startValues = useMemo(() => getLocalValues(start), [start]);
  const endValues = useMemo(() => getLocalValues(end), [end]);

  const [showStartTime, setShowStartTime] = useState(() => startValues.hasTime);
  const [showEndTime, setShowEndTime] = useState(() => endValues.hasTime);

  useEffect(() => {
    setForceShowEnd(false);
    setError(null);
  }, [value]);

  const showEndInput = Boolean(end) || forceShowEnd;

  function commitRange(
    startDateStr: string,
    startTimeStr: string,
    isStartTimeActive: boolean,
    endDateStr: string,
    endTimeStr: string,
    isEndTimeActive: boolean
  ) {
    const nextStart = buildLocalDate(
      startDateStr,
      startTimeStr,
      isStartTimeActive
    );
    const nextEnd = showEndInput
      ? buildLocalDate(endDateStr, endTimeStr, isEndTimeActive)
      : null;

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

  function handleNoEndToggle(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      setForceShowEnd(false);
      const nextStart = buildLocalDate(
        startValues.date,
        startValues.time,
        showStartTime
      );
      const problem = validate(nextStart, null, due);
      setError(problem);
      if (problem) return;
      onChange(formatRange(nextStart, null));
    } else {
      setForceShowEnd(true);
    }
  }

  function handleClear() {
    setError(null);
    setForceShowEnd(false);
    onChange(null);
  }

  return (
    <div className="space-y-1.5">
      {/* one bordered pill, matching TargetBadge exactly — icon on the
          left, dates auto-sized (not stretched full width), no "Start
          Date"/"End Date" labels. Below 350px it switches to a 2-column
          grid: the icon spans both stacked lines, the arrow sits centered
          and rotated between them (see max-[350px]: variants below). */}
      <div
        className={clsx(
          'border-ink-600 text-ink-400 flex w-fit flex-wrap items-center gap-1.5 rounded-full border py-1 pr-2 pl-3 font-mono text-xs',
          'max-[350px]:grid max-[350px]:grid-cols-[auto_1fr] max-[350px]:items-center max-[350px]:gap-x-2 max-[350px]:gap-y-1 max-[350px]:rounded-2xl max-[350px]:px-3.5 max-[350px]:py-2.5'
        )}
      >
        <Target
          size={13}
          className="shrink-0 max-[350px]:col-start-1 max-[350px]:row-span-3 max-[350px]:self-center"
        />

        <span className="inline-flex shrink-0 items-center gap-1 max-[350px]:col-start-2 max-[350px]:row-start-1">
          <TimeToggle
            active={showStartTime}
            disabled={disabled}
            onClick={() => {
              const nextState = !showStartTime;
              setShowStartTime(nextState);
              commitRange(
                startValues.date,
                nextState ? startValues.time || '09:00' : '00:00',
                nextState,
                endValues.date,
                endValues.time,
                showEndTime
              );
            }}
          />
          <TextInput
            type="date"
            value={startValues.date}
            disabled={disabled}
            onChange={(e) => {
              commitRange(
                e.target.value,
                startValues.time,
                showStartTime,
                endValues.date,
                endValues.time,
                showEndTime
              );
            }}
            className="text-ink-400! w-[9.5rem]! shrink-0 border-0! bg-transparent! p-0! text-center text-xs!"
          />
          {showStartTime && startValues.date && (
            <TextInput
              type="time"
              value={startValues.time || '09:00'}
              disabled={disabled}
              onChange={(e) => {
                commitRange(
                  startValues.date,
                  e.target.value,
                  true,
                  endValues.date,
                  endValues.time,
                  showEndTime
                );
              }}
              className="text-ink-400! w-20! shrink-0 border-0! bg-transparent! p-0! text-center text-xs!"
            />
          )}
        </span>

        <span className="text-ink-600 shrink-0 max-[350px]:col-start-2 max-[350px]:row-start-2 max-[350px]:justify-self-center max-[350px]:rotate-90">
          →
        </span>

        <span className="inline-flex shrink-0 items-center gap-1 max-[350px]:col-start-2 max-[350px]:row-start-3">
          {/* checkbox always renders once a start date exists, so the user
              can toggle back to open-ended even after setting an end date —
              it just shows the ∞ glyph instead of the date fields when
              unchecked */}
          {startValues.date && (
            <label
              className="flex shrink-0 items-center gap-1 select-none"
              title={
                showEndInput
                  ? 'Check to make open-ended'
                  : 'Uncheck to set an end date'
              }
            >
              <input
                type="checkbox"
                checked={!showEndInput}
                disabled={disabled}
                onChange={handleNoEndToggle}
                className="accent-violet-400 h-3.5 w-3.5 shrink-0"
              />
              {!showEndInput && <span className="text-lg">∞</span>}
            </label>
          )}
          {showEndInput && (
            <>
              {/* toggle bookends the pill on the single-line (desktop)
                  layout — order-2 pushes it after the date — but goes back
                  to the left of its date once stacked to two lines */}
              <TimeToggle
                active={showEndTime}
                disabled={disabled}
                className="order-2 max-[350px]:order-none"
                onClick={() => {
                  const nextState = !showEndTime;
                  setShowEndTime(nextState);
                  commitRange(
                    startValues.date,
                    startValues.time,
                    showStartTime,
                    endValues.date,
                    nextState ? endValues.time || '18:00' : '00:00',
                    nextState
                  );
                }}
              />
              <TextInput
                type="date"
                value={endValues.date}
                disabled={disabled}
                onChange={(e) => {
                  commitRange(
                    startValues.date,
                    startValues.time,
                    showStartTime,
                    e.target.value,
                    endValues.time,
                    showEndTime
                  );
                }}
                className="text-ink-400! w-[9.5rem]! shrink-0 border-0! bg-transparent! p-0! text-center text-xs!"
              />
              {showEndTime && endValues.date && (
                <TextInput
                  type="time"
                  value={endValues.time || '18:00'}
                  disabled={disabled}
                  onChange={(e) => {
                    commitRange(
                      startValues.date,
                      startValues.time,
                      showStartTime,
                      endValues.date,
                      e.target.value,
                      true
                    );
                  }}
                  className="text-ink-400! w-20! shrink-0 border-0! bg-transparent! p-0! text-center text-xs!"
                />
              )}
            </>
          )}
        </span>

        {!hideClear && (start || end) && (
          <button
            type="button"
            disabled={disabled}
            onClick={handleClear}
            title="Clear target"
            className="text-ink-500 hover:text-rust-500 ml-1 flex shrink-0 items-center max-[350px]:col-start-2 max-[350px]:row-start-3 max-[350px]:ml-auto"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {error && <p className="text-rust-500 text-xs font-medium">{error}</p>}
    </div>
  );
}
