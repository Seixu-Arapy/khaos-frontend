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

export const STATUS_META = {
  planning: {
    label: 'Planning',
    dot: 'bg-ink-400',
    text: 'text-ink-300',
    bg: 'bg-ink-700/60',
  },
  todo: {
    label: 'To do',
    dot: 'bg-ink-300',
    text: 'text-ink-200',
    bg: 'bg-ink-700/60',
  },
  in_progress: {
    label: 'In progress',
    dot: 'bg-copper-500',
    text: 'text-copper-400',
    bg: 'bg-copper-500/10',
  },
  in_review: {
    label: 'In review',
    dot: 'bg-teal-500',
    text: 'text-teal-400',
    bg: 'bg-teal-500/10',
  },
  done: {
    label: 'Done',
    dot: 'bg-sage-500',
    text: 'text-sage-500',
    bg: 'bg-sage-500/10',
  },
  paused: {
    label: 'Paused',
    dot: 'bg-ink-400',
    text: 'text-ink-400',
    bg: 'bg-ink-700/40',
  },
  cancelled: {
    label: 'Cancelled',
    dot: 'bg-rust-500',
    text: 'text-ink-500 line-through',
    bg: 'bg-ink-700/30',
  },
  archived: {
    label: 'Archived',
    dot: 'bg-ink-600',
    text: 'text-ink-600',
    bg: 'bg-ink-700/20',
  },
};

export const PRIORITY_META = {
  urgent: {
    label: 'Urgent',
    text: 'text-rust-500',
    bg: 'bg-rust-500/10',
    ring: 'ring-rust-500/30',
  },
  high: {
    label: 'High',
    text: 'text-copper-500',
    bg: 'bg-copper-500/10',
    ring: 'ring-copper-500/30',
  },
  medium: {
    label: 'Medium',
    text: 'text-teal-400',
    bg: 'bg-teal-500/10',
    ring: 'ring-teal-500/30',
  },
  low: {
    label: 'Low',
    text: 'text-ink-400',
    bg: 'bg-ink-700/50',
    ring: 'ring-ink-600/30',
  },
};

export const EVENT_TYPE_META = {
  fixed: { label: 'Fixed', text: 'text-rust-500', bg: 'bg-rust-500/10' },
  scheduled: { label: 'Plan', text: 'text-teal-400', bg: 'bg-teal-500/10' },
};

// Active/open statuses, used to distinguish "still alive" work from done/cancelled.
export const OPEN_STATUSES = [
  'planning',
  'todo',
  'in_progress',
  'in_review',
  'paused',
];
