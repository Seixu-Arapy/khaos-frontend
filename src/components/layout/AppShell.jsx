import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import {
  LayoutDashboard,
  ListTodo,
  CalendarDays,
  Tags,
  ChevronDown,
  ChevronRight,
  Command,
  Plus,
  Bot,
  Menu,
  X,
  FolderKanban,
} from 'lucide-react';
import clsx from 'clsx';
import {
  useFields,
  useProjects,
  useProjectMutations,
} from '../../hooks/useHierarchy';
import ActiveTimerWidget from '../timeTracking/ActiveTimerWidget';
import QuickAddBar from '../tasks/QuickAddBar';
import CommandPalette from './CommandPalette';
import MomentPrompt from '../common/MomentPrompt';
import TimezonePicker from '../common/TimezonePicker';
import { StatusIcon } from '../common/ui';
import { useProcessingContext } from '../../lib/processingContext';
import { useMomentDetector } from '../../hooks/useMomentDetector';

// Bottom tab bar items (mobile) — keep to 5 max for thumb reach
const BOTTOM_NAV = [
  { to: '/', label: 'Today', icon: LayoutDashboard, end: true },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/assistant', label: 'Assistant', icon: Bot },
];

// Full sidebar nav (desktop)
const SIDEBAR_NAV = [
  { to: '/', label: 'Today', icon: LayoutDashboard, end: true },
  { to: '/tasks', label: 'All tasks', icon: ListTodo },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/tags', label: 'Tags', icon: Tags },
  { to: '/assistant', label: 'Assistant', icon: Bot },
];

function sidebarLinkClass({ isActive }) {
  return clsx(
    'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-copper-500/15 text-copper-400'
      : 'text-ink-300 hover:bg-ink-800 hover:text-ink-100'
  );
}

function bottomLinkClass({ isActive }) {
  return clsx(
    'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
    isActive ? 'text-copper-400' : 'text-ink-500'
  );
}

function FieldGroup({ field, projects, onNavigate }) {
  const [open, setOpen] = useState(true);
  const fieldProjects = projects.filter((p) => p.field_id === field.id);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-ink-500 hover:text-ink-300 flex w-full items-center gap-1 px-1 py-1 text-xs font-semibold tracking-wide uppercase"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {field.name}
      </button>
      {open && (
        <div className="border-ink-700 ml-1 space-y-0.5 border-l pl-3">
          {fieldProjects.map((p) => (
            <NavLink
              key={p.id}
              to={`/projects/${p.id}`}
              className={sidebarLinkClass}
              onClick={onNavigate}
            >
              <StatusIcon status={p.status} size={14} />
              <span className="truncate">{p.name}</span>
            </NavLink>
          ))}
          {!fieldProjects.length && (
            <p className="text-ink-600 px-2.5 py-1 text-xs">No projects yet</p>
          )}
        </div>
      )}
    </div>
  );
}

function KhaosLogo({ spinning }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-copper-400 text-xl leading-none select-none ${spinning ? 'animate-spin-slow' : ''}`}
        aria-hidden="true"
      >
        ✷
      </span>
      <span className="font-display text-ink-100 text-base font-semibold tracking-tight">
        Khaos
      </span>
    </div>
  );
}

function Sidebar({ onNavigate, spinning }) {
  const { data: fields = [] } = useFields();
  const { data: projects = [] } = useProjects();
  const { create } = useProjectMutations();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const unassigned = projects.filter((p) => !p.field_id);

  return (
    <>
      <div className="px-4 py-4">
        <KhaosLogo spinning={spinning} />
      </div>

      <nav className="space-y-0.5 px-3">
        {SIDEBAR_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={sidebarLinkClass}
            onClick={onNavigate}
          >
            <item.icon size={16} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-5 flex items-center justify-between px-4">
        <span className="text-ink-500 text-xs font-semibold tracking-wide uppercase">
          Fields
        </span>
        <button
          onClick={() => {
            const name = window.prompt('New project name');
            if (name?.trim())
              create.create.mutate({ name: name.trim(), status: 'planning' });
          }}
          className="text-ink-500 hover:bg-ink-800 hover:text-ink-200 flex h-5 w-5 items-center justify-center rounded"
          aria-label="New project"
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="mt-2 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {fields.map((field) => (
          <FieldGroup
            key={field.id}
            field={field}
            projects={projects}
            onNavigate={onNavigate}
          />
        ))}
        {Boolean(unassigned.length) && (
          <FieldGroup
            field={{ id: '__none', name: 'Unsorted' }}
            projects={unassigned}
            onNavigate={onNavigate}
          />
        )}
        {!fields.length && !unassigned.length && (
          <p className="text-ink-600 px-2 text-xs">
            Create a project to get started.
          </p>
        )}
      </div>

      <button
        onClick={() => setPaletteOpen(true)}
        className="border-ink-700 text-ink-500 hover:border-ink-600 hover:text-ink-300 mx-3 mb-3 flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs"
      >
        <span className="flex items-center gap-1.5">
          <Command size={12} /> Quick navigate
        </span>
        <span className="font-mono">⌘K</span>
      </button>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </>
  );
}

export default function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { current: momentPrompt, dismiss: dismissMoment } = useMomentDetector();
  const { isAssistantProcessing } = useProcessingContext();
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const spinning = isAssistantProcessing || isFetching > 0 || isMutating > 0;
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Cmd+K palette shortcut
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setDrawerOpen(false);
        // Palette lives inside Sidebar — trigger via a custom event
        window.dispatchEvent(new CustomEvent('open-palette'));
      }
      if (e.key === 'Escape') setDrawerOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="bg-ink-900 flex h-[100dvh] overflow-hidden">
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="border-ink-700 bg-ink-900 hidden w-60 shrink-0 flex-col border-r md:flex">
        <Sidebar onNavigate={() => {}} spinning={spinning} />
      </aside>

      {/* ── Mobile drawer backdrop ───────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile drawer panel ──────────────────────────────── */}
      <aside
        className={clsx(
          'border-ink-700 bg-ink-900 fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r transition-transform duration-200 md:hidden',
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <KhaosLogo spinning={spinning} />
          <button
            onClick={() => setDrawerOpen(false)}
            className="text-ink-400 hover:text-ink-100"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        {/* Reuse sidebar contents, close drawer on navigation */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Sidebar
            onNavigate={() => setDrawerOpen(false)}
            spinning={spinning}
          />
        </div>
      </aside>

      {/* ── Main content area ────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top header */}
        <header className="border-ink-700 flex shrink-0 items-center gap-2 border-b px-3 py-2.5 md:px-5 md:py-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-ink-400 hover:bg-ink-800 flex h-8 w-8 shrink-0 items-center justify-center rounded md:hidden"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>

          <QuickAddBar />

          {/* Timer — hidden on very small screens, visible md+ */}
          <div className="hidden sm:block">
            <ActiveTimerWidget />
          </div>
          <TimezonePicker />
        </header>

        {/* Page content — extra bottom padding on mobile for the tab bar */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* ── Mobile bottom tab bar ─────────────────────────── */}
        <nav className="border-ink-700 bg-ink-900 flex shrink-0 border-t md:hidden">
          {BOTTOM_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={bottomLinkClass}
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <MomentPrompt prompt={momentPrompt} onDismiss={dismissMoment} />
    </div>
  );
}
