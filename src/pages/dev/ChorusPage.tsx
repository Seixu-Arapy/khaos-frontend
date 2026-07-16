import { useEffect, useState } from 'react';
import { Moon, Sparkles, Heart, Waves, CloudMoon, Check, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
  samples: string[];
  family: 'display' | 'body' | 'mono';
  deity: string;
  icon: LucideIcon;
  color: string;
}

// Deity assignment follows each step's actual role, reusing the exact
// icons/colors from The Pantheon rather than inventing a new set (per
// request — these two chambers should read as one system). Two sample
// sentences per step, not one -- proves the size/weight combination
// holds up across more than a single lucky sentence.
const STEPS: Step[] = [
  {
    token: 'text-label',
    px: 10,
    role: 'micro-labels',
    ratioFromPrev: 'root',
    weight: 'font-semibold uppercase tracking-wide',
    samples: ['sleeping in Hypnos', 'quietest signal, 10px'],
    family: 'mono',
    deity: 'Hypnos',
    icon: CloudMoon,
    color: '#9478b8',
  },
  {
    token: 'text-caption',
    px: 12,
    role: 'hints, metadata',
    ratioFromPrev: '6:5 · 1.20',
    weight: 'font-normal',
    samples: ['last seen in Aether, 2m ago', "synced with Aether's light"],
    family: 'body',
    deity: 'Aether',
    icon: Sparkles,
    color: '#f1f2f0',
  },
  {
    token: 'text-body',
    px: 14,
    role: 'task names, primary rows',
    ratioFromPrev: '7:6 · 1.17',
    weight: 'font-medium',
    samples: [
      "Chart Nyx's darkest shade before dawn",
      "Every task begins in Nyx's dark",
    ],
    family: 'body',
    deity: 'Nyx',
    icon: Moon,
    color: '#aeb6c4',
  },
  {
    token: 'text-display',
    px: 18,
    role: 'modal / section titles',
    ratioFromPrev: '9:7 · 1.29',
    weight: 'font-semibold',
    samples: ["Pontus's tide report", 'Cast off with Pontus'],
    family: 'display',
    deity: 'Pontus',
    icon: Waves,
    color: '#4d928e',
  },
  {
    token: 'text-display-lg',
    px: 24,
    role: 'page titles',
    ratioFromPrev: '4:3 · 1.33',
    weight: 'font-bold',
    samples: ['Khaos Vortex', 'Court Eros'],
    family: 'display',
    deity: 'Eros',
    icon: Heart,
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

// Badge side length = ~4 lines of the row's own specimen text, so the
// marks visibly grow across the scale the same way the type does.
function badgeSize(px: number) {
  return Math.round(px * 1.3 * 4);
}

// Badges grow with each step, but the sample text after them still needs
// to land in a straight column -- right-align every badge inside a fixed
// column as wide as the largest one, instead of letting text drift right
// as the badge grows.
const maxBadgeSize = Math.max(...STEPS.map((s) => badgeSize(s.px)));

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
        <h2 className="text-ink-200 font-display mb-3 text-sm tracking-wide uppercase">
          Fonts
        </h2>
        <div className="flex flex-col gap-8">
          {fontRows.map(({ token, stack, family, loaded }) => (
            <div key={token}>
              <span className="text-ink-500 block font-mono text-[10px]">
                --font-{token}
              </span>
              <div className="mt-1 flex items-center gap-3">
                <span className="text-ink-300 font-mono text-xs">
                  {family || '(empty)'}
                </span>
                {loaded ? (
                  <span className="text-sage-500 inline-flex items-center gap-1 font-mono text-[10px]">
                    <Check size={11} /> loaded
                  </span>
                ) : (
                  <span className="text-rust-500 inline-flex items-center gap-1 font-mono text-[10px]">
                    <AlertTriangle size={11} /> NOT loaded — falling back
                  </span>
                )}
              </div>
              <p
                className="text-ink-100 mt-2 text-3xl leading-snug"
                style={{ fontFamily: stack }}
              >
                {FONT_SAMPLES[token]}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-ink-200 font-display mb-8 text-sm tracking-wide uppercase">
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
                <p className="text-ink-100 font-mono text-xs">{s.token}</p>
                <p className="text-ink-400 font-mono text-[10px]">
                  {s.px}px · {s.ratioFromPrev}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-ink-200 max-w-prose text-sm leading-relaxed mt-10">
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
                <span className="text-ink-400 text-right font-mono text-[10px]">
                  {pair.name} · {pair.ratio} — {pair.a.token} : {pair.b.token}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex max-w-4xl flex-col gap-8">
        {STEPS.map((s) => {
          const size = badgeSize(s.px);
          return (
            <div key={s.token} className="flex items-center gap-5">
              <div
                className="flex shrink-0 items-center justify-end"
                style={{ width: maxBadgeSize }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: size,
                    height: size,
                    backgroundColor: `${s.color}1a`,
                    border: `1px solid ${s.color}55`,
                  }}
                  title={s.deity}
                >
                  <s.icon
                    size={Math.round(size * 0.4)}
                    strokeWidth={1.25}
                    style={{ color: s.color }}
                  />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  {s.samples.map((sample, i) => (
                    <div key={sample} className="flex items-baseline gap-3">
                      {i > 0 && (
                        <span className="text-ink-600 text-xs">·</span>
                      )}
                      <p
                        className={`font-${s.family} ${s.weight} truncate`}
                        style={{
                          fontSize: s.px,
                          color: s.color,
                          opacity: i === 0 ? 1 : 0.55,
                        }}
                      >
                        {sample}
                      </p>
                    </div>
                  ))}
                </div>
                <span className="text-ink-300 mt-1.5 block font-mono text-[10px]">
                  {s.role} · {s.deity}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Chamber>
  );
}
