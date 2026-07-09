// Postgres returns tstzrange columns as text like:
//   ["2024-06-21 10:00:00+00","2024-06-21 11:00:00+00")
// or with an open (still running) upper bound:
//   ["2024-06-21 10:00:00+00",)
// This module parses that text into {start, end} Dates and formats Dates
// back into a literal Postgres will accept on insert/update.

export interface ParsedRange {
  start: Date | null;
  end: Date | null;
  lowerInclusive?: boolean;
  upperInclusive?: boolean;
}

export function parseRange(rangeStr: unknown): ParsedRange {
  if (!rangeStr || typeof rangeStr !== 'string') {
    return { start: null, end: null };
  }
  const trimmed = rangeStr.trim();
  if (trimmed.length < 2) return { start: null, end: null };

  const lowerInclusive = trimmed[0] === '[';
  const upperInclusive = trimmed[trimmed.length - 1] === ']';
  const inner = trimmed.slice(1, -1);

  // Split on the first comma that isn't inside quotes.
  let splitAt = -1;
  let inQuotes = false;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) {
      splitAt = i;
      break;
    }
  }
  const startRaw = (splitAt === -1 ? inner : inner.slice(0, splitAt))
    .replace(/^"|"$/g, '')
    .trim();
  const endRaw = (splitAt === -1 ? '' : inner.slice(splitAt + 1))
    .replace(/^"|"$/g, '')
    .trim();

  return {
    start: startRaw ? new Date(startRaw) : null,
    end: endRaw ? new Date(endRaw) : null,
    lowerInclusive,
    upperInclusive,
  };
}

export function formatRange(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined
): string {
  const s = start ? new Date(start).toISOString() : '';
  const e = end ? new Date(end).toISOString() : '';
  return `[${s},${e})`;
}

export function isOpenRange(rangeStr: unknown): boolean {
  const { start, end } = parseRange(rangeStr);
  return Boolean(start) && !end;
}

export function rangeDurationMinutes(
  rangeStr: unknown,
  now: Date = new Date()
): number {
  const { start, end } = parseRange(rangeStr);
  if (!start) return 0;
  const endTime = end || now;
  return Math.max(0, Math.round((endTime.getTime() - start.getTime()) / 60000));
}
