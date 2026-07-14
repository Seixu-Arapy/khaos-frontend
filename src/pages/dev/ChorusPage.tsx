import { Moon, Sparkles, Heart, Waves, CloudMoon } from 'lucide-react';
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

interface Interval {
  name: string;
  ratio: string;
  factor: number;
  color: string;
}

// Colors borrowed from three Pantheon deities, same logic as STEPS below --
// one color per interval, not per square, so the pair reads as one idea.
const INTERVALS: Interval[] = [
  { name: 'Octave', ratio: '2:1', factor: 2, color: '#d08f4e' },
  { name: 'Fifth', ratio: '3:2', factor: 1.5, color: '#4d928e' },
  { name: 'Third', ratio: '5:4', factor: 1.25, color: '#9478b8' },
];

const UNIT = 48;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// One random character per interval, picked once at module load (not on
// every render) so the pair stays stable while you look at it -- the
// point is the size relationship between the two squares, not the
// letter itself, so both squares in a pair share the same character.
const INTERVAL_CHARS = INTERVALS.map(
  () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
);

interface Step {
  token: string;
  px: number;
  role: string;
  ratioFromPrev: string;
  weight: string;
  sample: string;
  family: 'display' | 'body' | 'mono';
  deity: string;
  icon: LucideIcon;
  color: string;
}

// Deity assignment follows each step's actual role, reusing the exact
// icons/colors from The Pantheon rather than inventing a new set (per
// request — these two chambers should read as one system).
const STEPS: Step[] = [
  {
    token: 'text-label',
    px: 10,
    role: 'micro-labels',
    ratioFromPrev: 'root',
    weight: 'font-semibold uppercase tracking-wide',
    sample: 'in progress',
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
    sample: 'Last synced 2 minutes ago',
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
    sample: 'Rework onboarding checklist copy',
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
    sample: 'Sprint review',
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
    sample: 'Khaos Vortex',
    family: 'display',
    deity: 'Eros',
    icon: Heart,
    color: '#d08f4e',
  },
];

// Badge side length = ~4 lines of the row's own specimen text, so the
// marks visibly grow across the scale the same way the type does.
function badgeSize(px: number) {
  return Math.round(px * 1.3 * 4);
}

// The glyph on "the strings" is shown at a magnified but still
// proportional size (x5) so a 10px vs 24px difference is legible at a
// glance without needing a 24px string to literally be 24px tall.
function glyphSize(px: number) {
  return Math.round(px * 5);
}

export default function ChorusPage() {
  return (
    <Chamber
      index="II"
      name="The Chorus"
      tagline="The type scale, sung as a set of harmonic intervals"
    >
      <div className="mb-10">
        <h2 className="text-ink-200 font-display mb-3 text-sm tracking-wide uppercase">
          What the scale is built on
        </h2>
        <p className="text-ink-200 max-w-prose text-sm leading-relaxed">
          Pythagoras tied musical harmony to small-integer ratios — an
          octave is 2:1, a fifth is 3:2, a major third is 5:4. This
          scale&apos;s five steps grow by ratios in that same family (1.17
          – 1.33), which is also, not by accident, what Tailwind&apos;s
          default text sizes already use. Nothing below is a new
          invention — it is the sizes already in use across the app,
          given one deliberate shape instead of five separate guesses.
        </p>
      </div>

      <div className="mb-10">
        <h2 className="text-ink-200 font-display mb-8 text-sm tracking-wide uppercase">
          The strings
        </h2>
        <div className="flex items-end justify-between gap-3 overflow-x-auto pb-2">
          {STEPS.map((s) => (
            <div key={s.token} className="flex flex-col items-center gap-3">
              <span
                className={`font-${s.family} leading-none`}
                style={{ fontSize: glyphSize(s.px), color: s.color }}
              >
                A
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

        <div className="mt-10 flex flex-wrap gap-x-10 gap-y-6">
          {INTERVALS.map((interval, i) => {
            const char = INTERVAL_CHARS[i];
            return (
              <div key={interval.name} className="flex flex-col gap-2">
                <div className="flex items-end">
                  <div
                    className="flex items-center justify-end"
                    style={{
                      width: UNIT,
                      height: UNIT,
                      fontSize: UNIT * 0.55,
                      color: interval.color,
                      backgroundColor: `${interval.color}1a`,
                      border: `1px solid ${interval.color}55`,
                      paddingRight: 6,
                    }}
                  >
                    {char}
                  </div>
                  <div
                    className="flex items-center justify-start border-l-0"
                    style={{
                      width: UNIT * interval.factor,
                      height: UNIT * interval.factor,
                      fontSize: UNIT * interval.factor * 0.55,
                      color: interval.color,
                      backgroundColor: `${interval.color}1a`,
                      border: `1px solid ${interval.color}55`,
                      paddingLeft: 6,
                    }}
                  >
                    {char}
                  </div>
                </div>
                <span className="text-ink-400 font-mono text-[10px]">
                  {interval.name} · {interval.ratio}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-ink-700 flex flex-col border">
        {STEPS.map((s) => {
          const size = badgeSize(s.px);
          return (
            <div
              key={s.token}
              className="border-ink-700 flex items-center gap-5 border-t p-4 first:border-t-0"
            >
              <div
                className="flex shrink-0 items-center justify-center"
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

              <div className="min-w-0 flex-1">
                <p
                  className={`font-${s.family} ${s.weight} truncate`}
                  style={{ fontSize: s.px, color: s.color }}
                >
                  {s.sample}
                </p>
                <span className="text-ink-300 mt-1 block font-mono text-[10px]">
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
