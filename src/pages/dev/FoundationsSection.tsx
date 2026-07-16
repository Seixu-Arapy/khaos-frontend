// Round 1 — Foundations: live view of the design tokens declared in
// src/index.css. Everything on this page is read from the real CSS
// variables at runtime (Tailwind v4 @theme emits them on :root), so it
// cannot drift from the stylesheet.
//
// Colors moved to The Pantheon (all of them are covered there now), and
// Fonts moved to The Chorus (type-scale chamber) — this section is left
// with just radii and shadows.

// No 'sm' entry: --radius-sm was dropped as a redundant override of
// Tailwind's own identical built-in value (see index.css).
const RADIUS_TOKENS = ['', 'lg'];
const SHADOW_TOKENS = ['card', 'panel'];

function readVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

function GroupTitle({ children }: { children: string }) {
  return (
    <h2 className="text-ink-200 font-display mb-4 text-sm tracking-wide uppercase">
      {children}
    </h2>
  );
}

interface UsageRule {
  token: string;
  rule: string;
  examples: string;
}

// Practice, not theory -- each rule below reflects how the token is
// already used across the real app (checked directly, not guessed), so
// this is a description of existing convention as much as a standard
// to follow going forward.
const RADIUS_RULES: UsageRule[] = [
  {
    token: 'rounded-sm',
    rule: "Tailwind's own default (4px) -- no app override. Small inline accents only.",
    examples: 'e.g. the logged-time indicator bar in CalendarView',
  },
  {
    token: 'rounded (bare)',
    rule: '--radius, 6px. The default for standard interactive controls and small surfaces.',
    examples: 'icon buttons, checkboxes, text inputs, small badges',
  },
  {
    token: 'rounded-md',
    rule: "Tailwind's own default (6px, same value as this app's bare rounded). Most buttons and menu items use this explicitly rather than the bare class.",
    examples: 'primary/secondary buttons, dropdown menu items, kanban cards',
  },
  {
    token: 'rounded-lg',
    rule: '--radius-lg, 10px. Larger surfaces that hold other content.',
    examples: 'modals, dropdown panels, empty states, the command palette',
  },
  {
    token: 'rounded-full',
    rule: "Tailwind's own default. Anything meant to read as circular or capsule-shaped, independent of the radius scale above.",
    examples: 'avatars, status dots, pills/chips, toggle switches, the FAB',
  },
];

const SHADOW_RULES: UsageRule[] = [
  {
    token: '--shadow-card',
    rule: 'Subtle, low elevation. Individual items sitting flat on the page that still need to feel slightly liftable (e.g. draggable).',
    examples: 'Kanban and Priority board cards',
  },
  {
    token: '--shadow-panel',
    rule: 'Stronger, higher elevation. Anything floating above other content.',
    examples: 'dropdown menus, the select control, the command palette, the FAB, the mobile chat drawer',
  },
  {
    token: '(no shadow)',
    rule: "Most flat content -- lists, rows, static cards -- uses a border-ink-700 border instead of a shadow. Shadows are reserved for things that genuinely float; a bordered flat surface doesn't need one.",
    examples: 'task lists, project cards, section columns',
  },
];

function UsageTable({ title, rows }: { title: string; rows: UsageRule[] }) {
  return (
    <div className="mt-6">
      <span className="text-ink-500 mb-2 block font-mono text-[10px]">
        {title}
      </span>
      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.token} className="flex flex-col gap-0.5">
            <code className="text-copper-400 font-mono text-xs">
              {r.token}
            </code>
            <p className="text-ink-300 text-xs leading-relaxed">{r.rule}</p>
            <p className="text-ink-600 font-mono text-[10px]">
              {r.examples}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FoundationsSection() {
  return (
    <section className="mb-8">
      <GroupTitle>Radii &amp; shadows</GroupTitle>
      <div className="flex flex-wrap items-end gap-6">
        {RADIUS_TOKENS.map((r) => {
          const varName = r ? `--radius-${r}` : '--radius';
          const value = readVar(varName);
          return (
            <div key={varName} className="flex flex-col items-center gap-1.5">
              <div
                className="bg-ink-700 border-ink-600 h-16 w-16 border"
                style={{ borderRadius: value || undefined }}
              />
              <span className="text-ink-500 font-mono text-[10px]">
                {varName}: {value}
              </span>
            </div>
          );
        })}
        {SHADOW_TOKENS.map((s) => {
          const varName = `--shadow-${s}`;
          const value = readVar(varName);
          return (
            <div key={varName} className="flex flex-col items-center gap-1.5">
              <div
                className="bg-ink-800 h-16 w-24"
                style={{ boxShadow: value || undefined }}
              />
              <span className="text-ink-500 font-mono text-[10px]">
                {varName}
              </span>
            </div>
          );
        })}
      </div>

      <UsageTable title="When to use which radius" rows={RADIUS_RULES} />
      <UsageTable title="When to use which shadow" rows={SHADOW_RULES} />
    </section>
  );
}
