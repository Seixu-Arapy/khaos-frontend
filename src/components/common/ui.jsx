import { useEffect, useRef } from 'react';
import {
  X,
  MessageCircle,
  CircleDashed,
  Play,
  Eye,
  Check,
  Pause,
  Ban,
  Archive,
  Flame,
  ChevronsUp,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import clsx from 'clsx';
import { STATUS_META, PRIORITY_META } from '../../lib/constants';
import { formatDueCompact, isOverdue } from '../../lib/dateUtils';

const STATUS_ICONS = {
  MessageCircle,
  CircleDashed,
  Play,
  Eye,
  Check,
  Pause,
  Ban,
  Archive,
};
const PRIORITY_ICONS = { Flame, ChevronsUp, ChevronUp, ChevronDown };

export function StatusIcon({ status, size = 18 }) {
  const meta = STATUS_META[status] || STATUS_META.planning;
  const Icon = STATUS_ICONS[meta.icon] || CircleDashed;
  return (
    <span
      title={meta.label}
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        color: meta.iconColor,
      }}
    >
      <Icon size={Math.round(size * 0.6)} />
    </span>
  );
}

export function StatusBadge({ status, size = 'sm' }) {
  const meta = STATUS_META[status] || STATUS_META.planning;
  const iconSize = size === 'sm' ? 18 : 24;

  return (
    <span
      title={meta.label}
      className="inline-flex items-center gap-0.5 rounded-md font-mono font-medium tracking-wider uppercase"
      style={{
        fontSize: size === 'sm' ? 11 : 13,
        marginRight: size === 'sm' ? 4 : 6,
        backgroundColor: meta.circleBg,
      }}
    >
      <StatusIcon status={status} size={iconSize} />
      <span className="pr-1" style={{ color: meta.iconColor }}>
        {meta.acronym}
      </span>
    </span>
  );
}

export function PriorityBadge({ priority = 'medium', size = 'sm' }) {
  if (!priority) return null;
  const meta = PRIORITY_META[priority] || PRIORITY_META.medium;
  const Icon = PRIORITY_ICONS[meta.icon] || ChevronUp;
  const px = size === 'sm' ? 24 : 28;
  return (
    <span
      title={meta.label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${priority == 'urgent' ? 'animate-bounce' : ''}`}
      style={{
        width: px,
        height: px,
        color: meta.iconColor,
      }}
    >
      <Icon size={Math.round(px * 0.55)} />
    </span>
  );
}

export function Tag({ children, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-2 py-0.5 text-xs font-medium text-teal-400">
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          className="rounded-full hover:bg-teal-500/20"
          aria-label="Remove tag"
        >
          <X size={11} />
        </button>
      )}
    </span>
  );
}

export function Button({
  variant = 'default',
  size = 'md',
  className,
  ...props
}) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
        variant === 'default' &&
          'bg-copper-500 text-ink-900 hover:bg-copper-400',
        variant === 'secondary' && 'bg-ink-700 text-ink-100 hover:bg-ink-600',
        variant === 'ghost' &&
          'text-ink-300 hover:bg-ink-800 hover:text-ink-100 bg-transparent',
        variant === 'danger' &&
          'text-rust-500 hover:bg-rust-500/10 bg-transparent',
        className
      )}
      {...props}
    />
  );
}

export function IconButton({ className, label, children, ...props }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={clsx(
        'text-ink-400 hover:bg-ink-700 hover:text-ink-100 inline-flex h-8 w-8 items-center justify-center rounded transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={clsx(
        'border-ink-600 bg-ink-800 text-ink-100 rounded border px-2.5 py-1.5 text-sm',
        'focus:border-copper-400 focus:outline-none',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function TextInput({ className, ...props }) {
  return (
    <input
      className={clsx(
        'border-ink-600 bg-ink-800 text-ink-100 placeholder:text-ink-500 w-full rounded border px-3 py-2 text-sm',
        'focus:border-copper-400 focus:outline-none',
        className
      )}
      {...props}
    />
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-lg',
}) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    // Focus the dialog itself only on open — not on every render.
    dialogRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]); // deliberately excludes onClose — handled via ref above

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-[8vh] backdrop-blur-sm">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={clsx(
          'border-ink-700 bg-ink-800 shadow-panel w-full rounded-lg border focus:outline-none',
          width
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-ink-700 flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="font-display text-ink-100 text-lg">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="border-ink-700 flex justify-end gap-2 border-t px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="border-ink-700 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-14 text-center">
      {Icon && <Icon size={28} className="text-ink-600" />}
      <p className="text-ink-300 font-medium">{title}</p>
      {hint && <p className="text-ink-500 max-w-xs text-sm">{hint}</p>}
    </div>
  );
}
export function DueBadge({ due, status }) {
  if (!due) return null;
  const parts = formatDueCompact(due);
  if (!parts) return null;
  const overdue = isOverdue(due, status);

  return (
    <span className="relative inline-flex items-center">
      <span
        className={`relative font-mono text-xs tracking-tight ${overdue && 'animate-pulse'}`}
        style={{ color: overdue ? '#f87171' : '#828DA0' }}
      >
        <span className="font-bold">{parts.day}</span>
        <span>{parts.month}</span>
      </span>
    </span>
  );
}
