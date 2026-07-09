// src/lib/constants.ts
// Mirrors the Postgres enums in the database exactly.
import type { EventType, MomentType, Priority, Status } from './types';

// public.status
export const STATUSES: Status[] = [
  'planning',
  'todo',
  'in_progress',
  'in_review',
  'done',
  'paused',
  'cancelled',
  'waiting',
];

// public.priority
export const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low'];

// public.event_types
export const EVENT_TYPES: EventType[] = ['scheduled', 'fixed', 'routine'];

// public.entity_types (used by work_tag_entities / moment_tag_entities)
export const ENTITY_TYPES = ['project', 'section', 'task'] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

// public.moment_types
export const MOMENT_TYPES: MomentType[] = [
  'created',
  'due',
  'estimate',
  'status',
  'started',
  'stopped',
  'scheduled',
  'target',
  'note',
  'priority',
];

// Each status has:
//   label     — full human name, shown as tooltip on hover
//   acronym   — 4-letter uppercase code displayed in the badge
//   icon      — lucide icon name (imported and mapped in StatusBadge)
//   iconColor — icon + acronym color
//   circleBg  — background of the icon circle
//   dot       — Tailwind class for the small sidebar dot (kept for AppShell)
interface StatusMeta {
  label: string;
  acronym: string;
  icon: string;
  iconColor: string;
  circleBg: string;
  dot: string;
}

export const STATUS_META: Record<Status, StatusMeta> = {
  planning: {
    label: 'Planning',
    acronym: 'PLAN',
    icon: 'MessageCircle',
    iconColor: '#AEB6C4',
    circleBg: '#2B3340',
    dot: 'bg-ink-500',
  },
  todo: {
    label: 'To do',
    acronym: 'TODO',
    icon: 'CircleDashed',
    iconColor: '#FAC775',
    circleBg: '#3a2e04',
    dot: 'bg-amber-300',
  },
  in_progress: {
    label: 'In progress',
    acronym: 'PROG',
    icon: 'Play',
    iconColor: '#EF9F27',
    circleBg: '#4a2e0a',
    dot: 'bg-amber-500',
  },
  in_review: {
    label: 'In review',
    acronym: 'REVW',
    icon: 'Eye',
    iconColor: '#5DCAA5',
    circleBg: '#085041',
    dot: 'bg-teal-400',
  },
  done: {
    label: 'Done',
    acronym: 'DONE',
    icon: 'Check',
    iconColor: '#97C459',
    circleBg: '#173404',
    dot: 'bg-green-400',
  },
  paused: {
    label: 'Paused',
    acronym: 'PAUS',
    icon: 'Pause',
    iconColor: '#888780',
    circleBg: '#2B3340',
    dot: 'bg-ink-400',
  },
  cancelled: {
    label: 'Cancelled',
    acronym: 'CANC',
    icon: 'Ban',
    iconColor: '#B5837F',
    circleBg: '#2C1F1F',
    dot: 'bg-rose-800',
  },
  waiting: {
    label: 'Waiting on previous',
    acronym: 'WAIT',
    icon: 'Hourglass',
    iconColor: '#8B93A6',
    circleBg: '#212836',
    dot: 'bg-slate-400',
  },
};

interface PriorityMeta {
  label: string;
  icon: string;
  iconColor: string;
  circleBg: string;
}

export const PRIORITY_META: Record<Priority, PriorityMeta> = {
  urgent: {
    label: 'Urgent',
    icon: 'Flame',
    iconColor: '#f97316',
    circleBg: '#3a1a04',
  },
  high: {
    label: 'High',
    icon: 'ChevronsUp',
    iconColor: '#f87171',
    circleBg: '#2C1F1F',
  },
  medium: {
    label: 'Medium',
    icon: 'ChevronUp',
    iconColor: '#60a5fa',
    circleBg: '#0a1a2a',
  },
  low: {
    label: 'Low',
    icon: 'ChevronDown',
    iconColor: '#6b7280',
    circleBg: '#1a1f1a',
  },
};

interface EventTypeMeta {
  label: string;
  text: string;
  bg: string;
  border: string;
  // Border-style carries the fixed/scheduled/routine distinction now, not a
  // per-type icon — solid means firm/immovable, dotted means not firm
  // (flexible plan or recurring), and color tells those two apart.
  borderStyle: string;
}

export const EVENT_TYPE_META: Record<EventType, EventTypeMeta> = {
  fixed: {
    label: 'Fixed',
    text: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-400',
    borderStyle: 'border-solid',
  },
  scheduled: {
    label: 'Plan',
    text: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-400',
    borderStyle: 'border-dotted',
  },
  routine: {
    label: 'Routine',
    text: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-400',
    borderStyle: 'border-dotted',
  },
};

// Active/open statuses — excludes done, cancelled
export const OPEN_STATUSES: Status[] = [
  'planning',
  'todo',
  'in_progress',
  'in_review',
  'paused',
  'waiting',
];
