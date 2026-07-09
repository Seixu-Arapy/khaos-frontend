export interface Interval {
  start: Date;
  end: Date;
}

export interface LogSegment extends Interval {
  matched: boolean;
}

// Splits [logStart, logEnd) into contiguous segments, marking which parts
// overlap at least one of the given intervals — typically that same task's
// own scheduled events, never a different task's — and which don't.
export function computeLogSegments(
  logStart: Date,
  logEnd: Date,
  overlapWith: Interval[]
): LogSegment[] {
  const clipped = overlapWith
    .map((iv) => ({
      start: iv.start > logStart ? iv.start : logStart,
      end: iv.end < logEnd ? iv.end : logEnd,
    }))
    .filter((iv) => iv.start < iv.end)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: Interval[] = [];
  for (const iv of clipped) {
    const last = merged[merged.length - 1];
    if (last && iv.start.getTime() <= last.end.getTime()) {
      if (iv.end.getTime() > last.end.getTime()) last.end = iv.end;
    } else {
      merged.push({ ...iv });
    }
  }

  const segments: LogSegment[] = [];
  let cursor = logStart;
  for (const m of merged) {
    if (cursor.getTime() < m.start.getTime()) {
      segments.push({ start: cursor, end: m.start, matched: false });
    }
    segments.push({ start: m.start, end: m.end, matched: true });
    cursor = m.end;
  }
  if (cursor.getTime() < logEnd.getTime()) {
    segments.push({ start: cursor, end: logEnd, matched: false });
  }
  return segments;
}
