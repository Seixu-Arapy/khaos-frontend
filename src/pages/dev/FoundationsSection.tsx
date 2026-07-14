// Round 1 — Foundations: live view of the design tokens declared in
// src/index.css. Everything on this page is read from the real CSS
// variables at runtime (Tailwind v4 @theme emits them on :root), so it
// cannot drift from the stylesheet.
//
// Colors moved to The Pantheon (all of them are covered there now), and
// Fonts moved to The Chorus (type-scale chamber) — this section is left
// with just radii and shadows.

const RADIUS_TOKENS = ['sm', '', 'lg'];
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
    </section>
  );
}
