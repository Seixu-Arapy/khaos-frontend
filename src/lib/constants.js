// Mirrors the Postgres enums in the database exactly.
// public.status
export const STATUSES = [
  'planning',
  'todo',
  'in_progress',
  'in_review',
  'done',
  'paused',
  'cancelled',
  'archived',
];

// public.priority
export const PRIORITIES = ['urgent', 'high', 'medium', 'low'];

// public.event_types
export const EVENT_TYPES = ['scheduled', 'fixed'];

// public.entity_types (used by work_tag_entities / moment_tag_entities)
export const ENTITY_TYPES = ['project', 'section', 'task'];

// public.moment_types
export const MOMENT_TYPES = [
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
export const STATUS_META = {
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
  archived: {
    label: 'Archived',
    acronym: 'ARCH',
    icon: 'Archive',
    iconColor: '#5F5E5A',
    circleBg: '#222220',
    dot: 'bg-ink-600',
  },
};

export const PRIORITY_META = {
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

export const EVENT_TYPE_META = {
  fixed: { label: 'Fixed', text: 'text-rust-500', bg: 'bg-rust-500/10' },
  scheduled: { label: 'Plan', text: 'text-teal-400', bg: 'bg-teal-500/10' },
};

// Active/open statuses — excludes done, cancelled, archived
export const OPEN_STATUSES = [
  'planning',
  'todo',
  'in_progress',
  'in_review',
  'paused',
];
