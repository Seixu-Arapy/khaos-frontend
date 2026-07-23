import { useEffect, useState } from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { Chamber } from './vaultUI';

// The Chorus — the type scale, framed as a musical/harmonic progression.
// Pythagoras tied musical harmony to small-integer ratios (9:8 whole tone,
// 5:4 major third, 4:3 fourth, 3:2 fifth); this scale's steps land in
// that same ~1.11-1.25 range, which is also exactly what Tailwind's own
// default text-* scale already uses. Nothing here is invented — it's the
// app's existing ad hoc sizes, named and made deliberate.
//
// No rounded corners anywhere on this page, and the scale is shown as
// actual proportionally-sized glyphs, not a horizontal bar -- font-size
// is a size, not a length, so a bar chart was the wrong shape for it.

interface Step {
  token: string;
  px: number;
  role: string;
  ratioFromPrev: string;
  weight: string;
  family: 'display' | 'body' | 'mono';
  deity: string;
  color: string;
}

// Deity assignment follows each step's actual role, reusing the exact
// colors from The Pantheon rather than inventing a new set (per
// request — these two chambers should read as one system).
const STEPS: Step[] = [
  {
    token: 'text-label',
    px: 10,
    role: 'micro-labels',
    ratioFromPrev: 'root',
    weight: 'font-semibold uppercase tracking-wide',
    family: 'mono',
    deity: 'Hypnos',
    color: '#9478b8',
  },
  {
    token: 'text-caption',
    px: 12,
    role: 'hints, metadata',
    ratioFromPrev: '6:5 · 1.20',
    weight: 'font-normal',
    family: 'body',
    deity: 'Aether',
    color: '#f1f2f0',
  },
  {
    token: 'text-body',
    px: 14,
    role: 'task names, primary rows',
    ratioFromPrev: '7:6 · 1.17',
    weight: 'font-medium',
    family: 'body',
    deity: 'Nyx',
    color: '#aeb6c4',
  },
  {
    token: 'text-display',
    px: 18,
    role: 'modal / section titles',
    ratioFromPrev: '9:7 · 1.29',
    weight: 'font-semibold',
    family: 'display',
    deity: 'Pontus',
    color: '#4d928e',
  },
  {
    token: 'text-display-lg',
    px: 24,
    role: 'page titles',
    ratioFromPrev: '4:3 · 1.33',
    weight: 'font-bold',
    family: 'display',
    deity: 'Eros',
    color: '#d08f4e',
  },
];

function stepByToken(token: string): Step {
  const step = STEPS.find((s) => s.token === token);
  if (!step) throw new Error(`Unknown step token: ${token}`);
  return step;
}

interface IntervalPair {
  name: string;
  ratio: string;
  a: Step;
  b: Step;
}

// Real ratios found inside the scale itself, not decorative squares --
// text-caption (12) : text-display-lg (24) is an exact 2:1 octave,
// text-caption (12) : text-display (18) is an exact 3:2 fifth, and
// text-display (18) : text-display-lg (24) is an exact 4:3 fourth. A
// "third" (5:4) doesn't land on any real pair in this five-step scale,
// so a fourth takes its place instead of forcing one.
const INTERVAL_PAIRS: IntervalPair[] = [
  { name: 'Octave', ratio: '2:1', a: stepByToken('text-caption'), b: stepByToken('text-display-lg') },
  { name: 'Fifth', ratio: '3:2', a: stepByToken('text-caption'), b: stepByToken('text-display') },
  { name: 'Fourth', ratio: '4:3', a: stepByToken('text-display'), b: stepByToken('text-display-lg') },
];

// Magnified but still proportional, same logic as glyphSize below -- a
// 12px vs 24px pair needs blowing up to read clearly on screen while
// keeping the real 2:1 relationship intact.
function intervalBoxSize(px: number) {
  return Math.round(px * 5);
}

const FONT_TOKENS = ['display', 'body', 'serif', 'mono'] as const;

// One sample per font, all ~50-58 chars so weight/width differences are
// comparable at a glance — moved here from The Wellspring, since the
// scale and the fonts that render it belong in the same chamber now.
const FONT_SAMPLES: Record<(typeof FONT_TOKENS)[number], string> = {
  display: 'Nyx holds the ink; 7 sigils wait in the Vault — #1 opens.',
  body: 'Eros lit the forge at dawn; 3 embers drift past gate #9.',
  serif: 'Pontus carried 12 tales west while Gaia counted the days.',
  mono: 'tartarus[500] -> hue 345deg +18% @ L47% #b43c5a',
};

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
  token: (typeof FONT_TOKENS)[number];
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

// Wraps one line of the "scale in motion" mock with its token name
// floating in the right gutter, dimmed -- the mock stays readable as a
// real screen fragment, and the annotation reads as a marginal note,
// not part of the UI. Colored per the token's Pantheon deity so the
// annotations tie back to the strings above.
function Annotated({
  token,
  className = '',
  children,
}: {
  token: string;
  className?: string;
  children: React.ReactNode;
}) {
  const step = stepByToken(token);
  return (
    <div className={`flex items-center justify-between gap-6 ${className}`}>
      <div className="min-w-0 flex-1">{children}</div>
      <code
        className="shrink-0 font-mono text-[10px] opacity-60"
        style={{ color: step.color }}
      >
        {token}
      </code>
    </div>
  );
}

// The glyph on "the strings" is shown at a magnified but still
// proportional size (x5) so a 10px vs 24px difference is legible at a
// glance without needing a 24px string to literally be 24px tall.
function glyphSize(px: number) {
  return Math.round(px * 5);
}

export default function ChorusPage() {
  const fontRows = useFontRows();

  return (
    <Chamber
      index="II"
      name="The Chorus"
      tagline="The type scale, sung as a set of harmonic intervals"
      wide
    >
      <div className="mb-10">
        <h2 className="text-nyx-200 font-display mb-3 text-sm tracking-wide uppercase">
          Fonts
        </h2>
        <div className="flex flex-col gap-8">
          {fontRows.map(({ token, stack, family, loaded }) => (
            <div key={token}>
              <span className="text-nyx-500 block font-mono text-[10px]">
                --font-{token}
              </span>
              <div className="mt-1 flex items-center gap-3">
                <span className="text-nyx-300 font-mono text-xs">
                  {family || '(empty)'}
                </span>
                {loaded ? (
                  <span className="text-gaia-500 inline-flex items-center gap-1 font-mono text-[10px]">
                    <Check size={11} /> loaded
                  </span>
                ) : (
                  <span className="text-tartarus-500 inline-flex items-center gap-1 font-mono text-[10px]">
                    <AlertTriangle size={11} /> NOT loaded — falling back
                  </span>
                )}
              </div>
              <p
                className="text-nyx-100 mt-2 text-3xl leading-snug"
                style={{ fontFamily: stack }}
              >
                {FONT_SAMPLES[token]}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-nyx-200 font-display mb-8 text-sm tracking-wide uppercase">
          The strings of the scale
        </h2>
        <div className="flex items-end justify-between gap-3 overflow-x-auto pb-2">
          {STEPS.map((s) => (
            <div key={s.token} className="flex flex-col items-center gap-3">
              <span
                className={`font-${s.family} leading-none`}
                style={{ fontSize: glyphSize(s.px), color: s.color }}
              >
                {s.deity[0]}
              </span>
              <div className="text-center">
                <p className="text-nyx-100 font-mono text-xs">{s.token}</p>
                <p className="text-nyx-400 font-mono text-[10px]">
                  {s.px}px · {s.ratioFromPrev}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-nyx-200 max-w-prose text-sm leading-relaxed mt-10">
          Pythagoras tied musical harmony to small-integer ratios — an
          octave is 2:1, a fifth is 3:2, a major third is 5:4. This
          scale&apos;s five steps grow by ratios in that same family (1.17
          – 1.33), which is also, not by accident, what Tailwind&apos;s
          default text sizes already use. Nothing below is a new
          invention — it is the sizes already in use across the app,
          given one deliberate shape instead of five separate guesses.
        </p>

        <div className="mt-10 grid grid-cols-3 items-end gap-x-10 gap-y-6">
          {INTERVAL_PAIRS.map((pair) => {
            const sizeA = intervalBoxSize(pair.a.px);
            const sizeB = intervalBoxSize(pair.b.px);
            return (
              <div key={pair.name} className="flex flex-col items-end gap-2">
                <div className="flex items-end">
                  <div
                    className="flex items-center justify-center overflow-hidden"
                    style={{
                      width: sizeA,
                      height: sizeA,
                      fontSize: sizeA,
                      lineHeight: 1,
                      color: pair.a.color,
                      backgroundColor: `${pair.a.color}1a`,
                      border: `1px solid ${pair.a.color}55`,
                    }}
                  >
                    {pair.a.deity[0]}
                  </div>
                  <div
                    className="flex items-center justify-center overflow-hidden"
                    style={{
                      width: sizeB,
                      height: sizeB,
                      fontSize: sizeB,
                      lineHeight: 1,
                      color: pair.b.color,
                      backgroundColor: `${pair.b.color}1a`,
                      border: `1px solid ${pair.b.color}55`,
                    }}
                  >
                    {pair.b.deity[0]}
                  </div>
                </div>
                <div className="text-right font-mono text-[10px]">
                  <p className="text-nyx-400">
                    {pair.name} · {pair.ratio}
                  </p>
                  <p className="text-nyx-600">
                    {pair.a.token} : {pair.b.token}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="max-w-4xl">
        <h2 className="text-nyx-200 font-display mb-3 text-sm tracking-wide uppercase">
          The scale in motion
        </h2>
        <p className="text-nyx-300 mb-8 max-w-prose text-sm leading-relaxed">
          Why five steps and not one? Because hierarchy is what makes a
          screen readable without reading it. Below, every step of the
          scale works one real screen fragment together — cover the
          annotations and the structure still tells you what each line
          is.
        </p>

        <div className="flex items-start gap-8">
          {/* A believable Khaos screen fragment, using real app chrome
              (card surface, borders, dots) so the scale is judged in
              its natural habitat rather than on empty ink. */}
          <div className="border-nyx-700 bg-nyx-800/40 min-w-0 flex-1 rounded-lg border p-6">
            <Annotated token="text-label">
              <p className="text-nyx-500 font-mono text-label font-semibold tracking-wide uppercase">
                court of eros · tonight
              </p>
            </Annotated>

            <Annotated token="text-display-lg" className="mt-1">
              <h3 className="font-display text-nyx-100 text-display-lg font-bold">
                Pontus&rsquo;s tide report
              </h3>
            </Annotated>

            <Annotated token="text-caption" className="mt-1">
              <p className="text-nyx-500 text-caption">
                last seen in Aether, 2m ago · 3 embers drifting
              </p>
            </Annotated>

            <div className="border-nyx-700 mt-5 border-t pt-5">
              <Annotated token="text-display">
                <h4 className="font-display text-nyx-200 text-display font-semibold">
                  Tasks for tonight
                </h4>
              </Annotated>

              <div className="mt-3 flex flex-col gap-2.5">
                <Annotated token="text-body">
                  <div className="flex items-center gap-2.5">
                    <span className="border-nyx-600 h-3.5 w-3.5 shrink-0 rounded-full border" />
                    <p className="text-nyx-100 text-body font-medium">
                      Chart Nyx&rsquo;s darkest shade before dawn
                    </p>
                  </div>
                </Annotated>

                <Annotated token="text-caption">
                  <p className="text-nyx-500 pl-6 text-caption">
                    due before first light · 1h 45m logged
                  </p>
                </Annotated>

                <Annotated token="text-body">
                  <div className="flex items-center gap-2.5">
                    <span className="border-nyx-600 h-3.5 w-3.5 shrink-0 rounded-full border" />
                    <p className="text-nyx-100 text-body font-medium">
                      Count Gaia&rsquo;s finished seasons
                    </p>
                  </div>
                </Annotated>

                <Annotated token="text-label">
                  <span className="bg-gaia-500/10 text-gaia-500 ml-6 inline-flex w-fit items-center rounded-full px-2 py-0.5 font-mono text-label font-semibold tracking-wide uppercase">
                    marked as done
                  </span>
                </Annotated>
              </div>
            </div>
          </div>
        </div>

        <p className="text-nyx-500 mt-6 max-w-prose text-xs leading-relaxed">
          One page title, one section title, task rows, their metadata,
          and a micro-label — five distinct jobs, five distinct sizes,
          zero ambiguity about what outranks what. That is the whole
          argument for a scale: the steps are far enough apart to read
          as different jobs (each jump is a real musical interval, 1.17
          – 1.33), and few enough that every choice is obvious.
        </p>
      </div>

      <div className="mt-14 max-w-4xl">
        <h2 className="text-nyx-200 font-display mb-3 text-sm tracking-wide uppercase">
          The wiring — how the old classes map
        </h2>
        <p className="text-nyx-300 mb-6 max-w-prose text-sm leading-relaxed">
          The scale is wired into the real app (not just this chamber).
          Every ad-hoc size class was swept to its named token —
          pixel-neutral by construction, since each token carries the
          same size and line-height as the class it replaced.
        </p>
        <div className="flex flex-col gap-7">
          {/* Each mapping with a live sample rendered in the token
              itself -- real app copy in real app styling, so the row
              proves the utility works, not just names it. */}
          {[
            [
              'text-2xl',
              'text-display-lg',
              'page titles',
              <h3 key="s" className="font-display text-nyx-100 text-display-lg font-bold">
                All tasks
              </h3>,
            ],
            [
              'text-lg',
              'text-display',
              'modal / section titles',
              <h4 key="s" className="font-display text-nyx-100 text-display">
                Edit task
              </h4>,
            ],
            [
              'text-sm',
              'text-body',
              'task names, controls, body copy',
              <p key="s" className="text-nyx-100 text-body font-medium">
                Chart Nyx&rsquo;s darkest shade before dawn
              </p>,
            ],
            [
              'text-xs',
              'text-caption',
              'hints, metadata',
              <p key="s" className="text-nyx-500 text-caption">
                Last synced 2 minutes ago
              </p>,
            ],
            [
              'text-[10px]',
              'text-label',
              'micro-labels',
              <span key="s" className="text-nyx-500 font-mono text-label font-semibold tracking-wide uppercase">
                in progress
              </span>,
            ],
          ].map(([from, to, role, sample]) => (
            <div key={to as string}>
              <p className="font-mono text-caption text-nyx-400">
                <span className="text-nyx-600">{from as string}</span>
                {' → '}
                <span className="text-eros-400">{to as string}</span>
                <span className="text-nyx-600"> · {role as string}</span>
              </p>
              <div className="mt-1.5">{sample}</div>
            </div>
          ))}
        </div>
        <p className="text-nyx-500 mt-6 max-w-prose text-caption leading-relaxed">
          Deliberately left alone: the wordmark (branding, not
          typography), icon glyph sizes, and the off-scale strays
          (text-base, 11px, 9px) — those are normalization candidates
          for the spacing/size cleanup pass, not silent swaps.
        </p>
      </div>
    </Chamber>
  );
}
