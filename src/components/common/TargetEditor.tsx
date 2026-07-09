import { useEffect, useMemo, useState } from 'react';
import { Clock, X } from 'lucide-react';
import { TextInput } from './ui';
import { parseRange, formatRange } from '../../lib/range';

interface TargetEditorProps {
  value?: string | null;
  due?: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
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
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        {/* Start Bound Input */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-ink-500 text-[11px] font-medium tracking-wider uppercase">
              Start Date
            </span>
            {startValues.date && (
              <button
                type="button"
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
                className={`flex items-center gap-0.5 rounded border px-1 text-[10px] transition-colors ${
                  showStartTime
                    ? 'border-copper-500 text-copper-400 bg-copper-500/10'
                    : 'border-ink-700 text-ink-500 hover:text-ink-300'
                }`}
              >
                <Clock size={10} /> {showStartTime ? 'Remove time' : 'Add time'}
              </button>
            )}
          </div>
          <div className="flex gap-1">
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
              className="w-full"
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
                className="w-20 shrink-0 text-center"
              />
            )}
          </div>
        </div>

        {/* End Bound Input */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-ink-500 text-[11px] font-medium tracking-wider uppercase">
              End Date
            </span>
            {showEndInput && endValues.date && (
              <button
                type="button"
                disabled={disabled}
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
                className={`flex items-center gap-0.5 rounded border px-1 text-[10px] transition-colors ${
                  showEndTime
                    ? 'border-copper-500 text-copper-400 bg-copper-500/10'
                    : 'border-ink-700 text-ink-500 hover:text-ink-300'
                }`}
              >
                <Clock size={10} /> {showEndTime ? 'Remove time' : 'Add time'}
              </button>
            )}
          </div>
          {showEndInput ? (
            <div className="flex gap-1">
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
                className="w-full"
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
                  className="w-20 shrink-0 text-center"
                />
              )}
            </div>
          ) : (
            <div className="border-ink-700 text-ink-600 flex h-[34px] items-center rounded border border-dashed px-3 text-xs italic">
              Open-ended
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-0.5">
        {startValues.date && (
          <label className="text-ink-500 flex items-center gap-1.5 text-xs select-none">
            <input
              type="checkbox"
              checked={!showEndInput}
              disabled={disabled}
              onChange={handleNoEndToggle}
              className="border-ink-600 bg-ink-800 checked:bg-copper-500 accent-copper-500 h-3.5 w-3.5 rounded"
            />
            No end date yet
          </label>
        )}

        {(start || end) && (
          <button
            type="button"
            disabled={disabled}
            onClick={handleClear}
            className="text-ink-500 hover:text-rust-500 ml-auto flex items-center gap-1 text-xs"
          >
            <X size={12} /> Clear window
          </button>
        )}
      </div>

      {error && (
        <p className="text-rust-500 mt-1 text-xs font-medium">{error}</p>
      )}
    </div>
  );
}
