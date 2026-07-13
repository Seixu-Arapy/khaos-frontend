import { useEffect, useState } from 'react';
import { Check, AlertTriangle } from 'lucide-react';

// Round 1 — Foundations: live view of the design tokens declared in
// src/index.css. Everything on this page is read from the real CSS
// variables at runtime (Tailwind v4 @theme emits them on :root), so it
// cannot drift from the stylesheet. Font rows additionally probe
// document.fonts to show whether the declared family actually loaded —
// a declared-but-missing font silently falls back, and this makes that
// visible instead.

const COLOR_GROUPS: Record<string, string[]> = {
  ink: ['900', '800', '700', '600', '500', '400', '300', '200', '100'],
  fog: ['50', '100', '200'],
  copper: ['50', '100', '400', '500', '600'],
  teal: ['50', '400', '500', '600'],
  sage: ['50', '500', '600'],
  rust: ['50', '500', '600'],
  violet: ['50', '400', '500', '600'],
};

const FONT_TOKENS = ['display', 'body', 'serif', 'mono'] as const;

const RADIUS_TOKENS = ['sm', '', 'lg'];
const SHADOW_TOKENS = ['card', 'panel'];

function readVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

// First family in a font stack, unquoted — the one the stack *wants*.
function firstFamily(stack: string): string {
  return (stack.split(',')[0] ?? '').replace(/['"]/g, '').trim();
}

interface FontRow {
  token: string;
  stack: string;
  family: string;
  loaded: boolean;
}

function useFontRows(): FontRow[] {
  const [rows, setRows] = useState<FontRow[]>([]);
  useEffect(() => {
    const probe = () =>
      setRows(
        FONT_TOKENS.map((token) => {
          const stack = readVar(`--font-${token}`);
          const family = firstFamily(stack);
          return {
            token,
            stack,
            family,
            loaded: family ? document.fonts.check(`16px "${family}"`) : false,
          };
        })
      );
    probe();
    // Fonts stream in after first paint; re-probe once they settle.
    document.fonts.ready.then(probe);
  }, []);
  return rows;
}

function GroupTitle({ children }: { children: string }) {
  return (
    <h2 className="text-ink-200 font-display mb-4 text-sm tracking-wide uppercase">
      {children}
    </h2>
  );
}

export default function FoundationsSection() {
  const fontRows = useFontRows();

  return (
    <>
      <section className="border-ink-700 mb-8 rounded-lg border p-5">
        <GroupTitle>Fonts</GroupTitle>
        <div className="flex flex-col gap-5">
          {fontRows.map(({ token, stack, family, loaded }) => (
            <div key={token}>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-ink-500 font-mono text-[10px]">
                  --font-{token}
                </span>
                {loaded ? (
                  <span className="text-sage-500 inline-flex items-center gap-1 font-mono text-[10px]">
                    <Check size={11} /> {family} loaded
                  </span>
                ) : (
                  <span className="text-rust-500 inline-flex items-center gap-1 font-mono text-[10px]">
                    <AlertTriangle size={11} /> {family || '(empty)'} NOT
                    loaded — falling back
                  </span>
                )}
              </div>
              <p
                className="text-ink-100 text-xl"
                style={{ fontFamily: stack }}
              >
                The quick brown fox jumps over the lazy dog — 0123456789
              </p>
              <p className="text-ink-600 mt-0.5 font-mono text-[10px]">
                {stack}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-ink-700 mb-8 rounded-lg border p-5">
        <GroupTitle>Colors</GroupTitle>
        <div className="flex flex-col gap-4">
          {Object.entries(COLOR_GROUPS).map(([group, steps]) => (
            <div key={group}>
              <span className="text-ink-500 mb-1.5 block font-mono text-[10px]">
                {group}
              </span>
              <div className="flex flex-wrap gap-2">
                {steps.map((step) => {
                  const varName = `--color-${group}-${step}`;
                  const value = readVar(varName);
                  return (
                    <div key={step} className="flex flex-col items-center gap-1">
                      <div
                        className="border-ink-700 h-12 w-16 rounded-md border"
                        style={{ backgroundColor: value || undefined }}
                        title={`${varName}: ${value}`}
                      />
                      <span className="text-ink-500 font-mono text-[10px]">
                        {step}
                      </span>
                      <span className="text-ink-600 font-mono text-[9px]">
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-ink-700 mb-8 rounded-lg border p-5">
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
                  className="bg-ink-800 h-16 w-24 rounded-lg"
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

      <section className="border-ink-700 mb-8 rounded-lg border p-5">
        <GroupTitle>Text as used today (ad hoc)</GroupTitle>
        <p className="text-ink-500 mb-4 max-w-prose text-xs">
          There is no defined type scale yet — pages pick sizes by hand. These
          are the combinations currently common in the app, for comparison
          when we design the real scale.
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <p className="font-display text-ink-100 text-xl">
              Q3 Staging Academy relaunch
            </p>
            <span className="text-ink-600 font-mono text-[10px]">
              font-display text-xl — page/modal titles
            </span>
          </div>
          <div>
            <p className="text-ink-100 text-sm font-medium">
              Rework onboarding checklist copy
            </p>
            <span className="text-ink-600 font-mono text-[10px]">
              text-sm font-medium — task names, primary rows
            </span>
          </div>
          <div>
            <p className="text-ink-300 text-sm">
              Waiting on design review before this can move to done.
            </p>
            <span className="text-ink-600 font-mono text-[10px]">
              text-sm ink-300 — body copy, descriptions
            </span>
          </div>
          <div>
            <p className="text-ink-500 text-xs">Last synced 2 minutes ago</p>
            <span className="text-ink-600 font-mono text-[10px]">
              text-xs ink-500 — captions, hints, metadata
            </span>
          </div>
          <div>
            <p className="text-ink-400 font-mono text-xs tracking-tight">
              1h 45m logged
            </p>
            <span className="text-ink-600 font-mono text-[10px]">
              font-mono text-xs — dates, durations, counters
            </span>
          </div>
          <div>
            <p className="text-ink-500 font-mono text-[10px] uppercase">
              in progress
            </p>
            <span className="text-ink-600 font-mono text-[10px]">
              font-mono 10px uppercase — micro-labels
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
