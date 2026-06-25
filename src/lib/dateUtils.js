// All date formatting now goes through timezone.js so that:
//   1. Timestamps are always displayed in the user's configured timezone
//   2. moments.time (stored without tz marker) is parsed as UTC correctly
//   3. datetime-local inputs read/write in the user's timezone, not the OS locale

import { formatDistanceToNowStrict } from 'date-fns';
import {
  formatDueInTz,
  isOverdueInTz,
  isTodayInTz,
  toDatetimeLocalInTz,
  fromDatetimeLocalInTz,
  formatTime,
  parseMomentTime,
  getTimezone,
} from './timezone';

export { parseMomentTime };

const EN_MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

// Returns { day: '06', month: 'DEC' } in the user's timezone
export function formatDueCompact(dateInput) {
  if (!dateInput) return null;
  const tz = getTimezone();
  const d = new Date(dateInput);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    day: '2-digit',
    month: 'numeric',
  }).formatToParts(d);
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? 1) - 1;
  return { day, month: EN_MONTHS[month] };
}

export function formatDue(dateInput) {
  return formatDueInTz(dateInput);
}

export function isOverdue(dateInput, status) {
  return isOverdueInTz(dateInput, status);
}

export function isToday(dateInput) {
  return isTodayInTz(dateInput);
}

export function minutesToHuman(mins) {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function elapsedSince(dateInput) {
  if (!dateInput) return '';
  return formatDistanceToNowStrict(new Date(dateInput));
}

// mm:ss or h:mm:ss live readout for the running timer widget
export function liveStopwatch(startDate, nowDate = new Date()) {
  const ms = Math.max(0, nowDate.getTime() - new Date(startDate).getTime());
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// For <input type="datetime-local"> — converts a UTC date to local wall-clock value
export function toDatetimeLocalValue(dateInput) {
  return toDatetimeLocalInTz(dateInput);
}

// Parses the string from <input type="datetime-local"> back to a UTC Date
export function fromDatetimeLocalValue(localStr) {
  return fromDatetimeLocalInTz(localStr);
}

// Format just the time portion (HH:mm) in user's timezone — used by calendar
export function formatTimeOnly(dateInput) {
  return formatTime(dateInput);
}
