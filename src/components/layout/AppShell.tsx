import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import type { NavLinkRenderProps } from 'react-router-dom';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import {
  LayoutDashboard,
  ListTodo,
  CalendarDays,
  Tags,
  Command,
  Plus,
  Menu,
  X,
  FolderKanban,
  RefreshCw,
  type LucideIcon,
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
import TimezonePicker from '../common/TimezonePicker';
import ChatPanel from '../assistant/ChatPanel';
import KhaosIcon from '../common/KhaosIcon'; // Certifique-se de que o caminho relativo está correto
import { StatusBadge, ProjectChip } from '../common/ui';
import { useProcessingContext } from '../../lib/processingContext';
import { useMomentDetector } from '../../hooks/useMomentDetector';
import { useMomentPrompts } from '../../lib/momentPromptsContext';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

// Bottom tab bar items (mobile) — Mantido sem o link fixo do Assistant porque ele vive no balão flutuante
const BOTTOM_NAV: NavItem[] = [
  { to: '/', label: 'Today', icon: LayoutDashboard, end: true },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
];

// Full sidebar nav (desktop) — Mantido sem o link fixo do Assistant porque ele vive no painel lateral persistente
const SIDEBAR_NAV: NavItem[] = [
  { to: '/', label: 'Today', icon: LayoutDashboard, end: true },
  { to: '/tasks', label: 'All tasks', icon: ListTodo },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/routines', label: 'Routines', icon: RefreshCw },
  { to: '/tags', label: 'Tags', icon: Tags },
];

function sidebarLinkClass({ isActive }: NavLinkRenderProps): string {
  return clsx(
    'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-copper-500/15 text-copper-400'
      : 'text-ink-300 hover:bg-ink-800 hover:text-ink-100'
  );
}

function bottomLinkClass({ isActive }: NavLinkRenderProps): string {
  return clsx(
    'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
    isActive ? 'text-copper-400' : 'text-ink-500'
  );
}

function KhaosLogo({ spinning }: { spinning?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <KhaosIcon size="h-5 w-5" spin={spinning} />
      <span className="font-display text-ink-100 text-base font-semibold tracking-tight">
        Khaos
      </span>
    </div>
  );
}

interface SidebarProps {
  onNavigate: () => void;
  onClose?: () => void;
  spinning?: boolean;
}

function Sidebar({ onNavigate, onClose, spinning }: SidebarProps) {
  const { data: fields = [] } = useFields();
  const { data: projects = [] } = useProjects();
  const { create } = useProjectMutations();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const fieldsById = new Map(fields.map((f) => [f.id, f]));

  return (
    <>
      <div className="flex items-center justify-between px-4 py-4">
        <KhaosLogo spinning={spinning} />
        {onClose && (
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-100"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
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
          Projects
        </span>
        <button
          onClick={() => {
            const name = window.prompt('New project name');
            if (name?.trim())
              create.mutate({ name: name.trim(), status: 'planning' });
          }}
          className="text-ink-500 hover:bg-ink-800 hover:text-ink-200 flex h-5 w-5 items-center justify-center rounded"
          aria-label="New project"
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {projects.map((p) => (
          <NavLink
            key={p.id}
            to={`/projects/${p.id}`}
            className={sidebarLinkClass}
            onClick={onNavigate}
          >
            <ProjectChip
              name={p.name}
              fieldName={p.field_id ? fieldsById.get(p.field_id)?.name : null}
              className="min-w-0 flex-1 text-sm text-inherit"
            />
            <StatusBadge status={p.status} />
          </NavLink>
        ))}
        {!projects.length && (
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
  const [chatSheetOpen, setChatSheetOpen] = useState(false);
  useMomentDetector();
  const { pendingCount: pendingMomentPrompts } = useMomentPrompts();
  const { isAssistantProcessing } = useProcessingContext();
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const spinning = isAssistantProcessing || isFetching > 0 || isMutating > 0;
  const location = useLocation();

  // Close drawer/sheet on route change
  useEffect(() => {
    setDrawerOpen(false);
    setChatSheetOpen(false);
  }, [location.pathname]);

  // Cmd+K palette shortcut, Esc closes any overlay
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setDrawerOpen(false);
        window.dispatchEvent(new CustomEvent('open-palette'));
      }
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        setChatSheetOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="bg-ink-900 flex h-dvh overflow-hidden">
      {/* ── Desktop nav sidebar ─────────────────────────────── */}
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
        <div className="flex flex-1 flex-col overflow-hidden">
          <Sidebar
            onNavigate={() => setDrawerOpen(false)}
            onClose={() => setDrawerOpen(false)}
            spinning={spinning}
          />
        </div>
      </aside>

      {/* ── Main content + persistent chat ──────────────────── */}
      <div className="flex min-w-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-ink-700 flex shrink-0 items-center gap-2 border-b px-3 py-2.5 md:px-5 md:py-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="text-ink-400 hover:bg-ink-800 flex h-8 w-8 shrink-0 items-center justify-center rounded md:hidden"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>

            <QuickAddBar />

            <div className="hidden sm:block">
              <ActiveTimerWidget />
            </div>
            <TimezonePicker />
          </header>

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

        {/* ── Persistent chat column — desktop/lg only ────────── */}
        <aside className="border-ink-700 bg-ink-900 hidden w-100 shrink-0 flex-col border-l lg:flex">
          <ChatPanel />
        </aside>
      </div>

      {/* ── Mobile floating chat bubble ──────────────────────── */}
      {!chatSheetOpen && (
        <button
          onClick={() => setChatSheetOpen(true)}
          className="shadow-panel fixed right-4 bottom-20 z-30 flex items-center justify-center rounded-full lg:hidden"
          aria-label={
            pendingMomentPrompts > 0
              ? `Open assistant (${pendingMomentPrompts} moment${pendingMomentPrompts === 1 ? '' : 's'} waiting for a note)`
              : 'Open assistant'
          }
        >
          <KhaosIcon
            size="h-13 w-13"
            bgColor="bg-copper-500"
            color="text-ink-900"
            spin={true}
          />
          {pendingMomentPrompts > 0 && (
            <span className="border-ink-900 bg-rust-500 absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 px-0.5 text-[10px] leading-none font-semibold text-white">
              {pendingMomentPrompts}
            </span>
          )}
        </button>
      )}

      {/* ── Mobile chat bottom-sheet ─────────────────────────── */}
      {chatSheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setChatSheetOpen(false)}
          />
          <div className="border-ink-700 bg-ink-900 shadow-panel relative flex h-[88vh] flex-col rounded-t-2xl border-t">
            <ChatPanel onRequestClose={() => setChatSheetOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
