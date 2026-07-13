import { Chamber } from './vaultUI';

// The Chorus — the type scale, framed as a musical/harmonic progression.
// Pythagoras tied musical harmony to small-integer ratios (9:8 whole tone,
// 5:4 major third, 4:3 fourth, 3:2 fifth); this scale's steps land in
// that same ~1.11-1.25 range, which is also exactly what Tailwind's own
// default text-* scale already uses. Nothing here is invented — it's the
// app's existing ad hoc sizes, named and made deliberate.

interface Step {
  token: string;
  px: number;
  role: string;
  ratioFromPrev: string;
  weight: string;
  sample: string;
  family: 'display' | 'body' | 'mono';
}

const STEPS: Step[] = [
  {
    token: 'text-label',
    px: 10,
    role: 'micro-labels',
    ratioFromPrev: 'root',
    weight: 'font-semibold uppercase tracking-wide',
    sample: 'in progress',
    family: 'mono',
  },
  {
    token: 'text-caption',
    px: 12,
    role: 'hints, metadata',
    ratioFromPrev: '6:5 · 1.20',
    weight: 'font-normal',
    sample: 'Last synced 2 minutes ago',
    family: 'body',
  },
  {
    token: 'text-body',
    px: 14,
    role: 'task names, primary rows',
    ratioFromPrev: '7:6 · 1.17',
    weight: 'font-medium',
    sample: 'Rework onboarding checklist copy',
    family: 'body',
  },
  {
    token: 'text-display',
    px: 18,
    role: 'modal / section titles',
    ratioFromPrev: '9:7 · 1.29',
    weight: 'font-semibold',
    sample: 'Sprint review',
    family: 'display',
  },
  {
    token: 'text-display-lg',
    px: 24,
    role: 'page titles',
    ratioFromPrev: '4:3 · 1.33',
    weight: 'font-bold',
    sample: 'Khaos Vortex',
    family: 'display',
  },
];

const MAX_PX = STEPS[STEPS.length - 1].px;

export default function ChorusPage() {
  return (
    <Chamber
      index="II"
      name="The Chorus"
      tagline="The type scale, sung as a set of harmonic intervals"
    >
      <div className="border-ink-700 bg-ink-800/40 mb-6 rounded-lg border p-5">
        <h2 className="text-ink-200 font-display mb-3 text-sm tracking-wide uppercase">
          What the scale is built on
        </h2>
        <p className="text-ink-300 max-w-prose text-sm leading-relaxed">
          Pythagoras tied musical harmony to small-integer ratios — an
          octave is 2:1, a fifth is 3:2, a major third is 5:4. This
          scale&apos;s five steps grow by ratios in that same family (1.17
          – 1.33), which is also, not by accident, what Tailwind&apos;s
          default
          text sizes already use. Nothing below is a new invention — it is
          the sizes already in use across the app, given one deliberate
          shape instead of five separate guesses.
        </p>
      </div>

      <div className="border-ink-700 bg-ink-800/40 rounded-lg border p-6">
        <h2 className="text-ink-200 font-display mb-6 text-sm tracking-wide uppercase">
          The strings
        </h2>
        <div className="flex flex-col gap-5">
          {STEPS.map((s, i) => (
            <div key={s.token} className="flex items-center gap-4">
              <div className="w-28 shrink-0 text-right">
                <p className="text-ink-100 font-mono text-xs">{s.token}</p>
                <p className="text-ink-600 font-mono text-[10px]">{s.px}px</p>
              </div>

              <div className="relative flex h-8 flex-1 items-center">
                <div
                  className="from-copper-600 to-copper-400 h-[3px] rounded-full bg-gradient-to-r"
                  style={{ width: `${(s.px / MAX_PX) * 100}%` }}
                />
                <div
                  className="border-copper-400 bg-ink-900 absolute h-3 w-3 -translate-x-1/2 rounded-full border-2"
                  style={{ left: `${(s.px / MAX_PX) * 100}%` }}
                />
              </div>

              <span className="text-ink-600 w-20 shrink-0 font-mono text-[10px]">
                {i === 0 ? '—' : s.ratioFromPrev}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {STEPS.map((s) => (
          <div
            key={s.token}
            className="border-ink-700 bg-ink-800/40 flex items-center justify-between gap-4 rounded-lg border p-4"
          >
            <p
              className={`font-${s.family} ${s.weight} text-ink-100 min-w-0 truncate`}
              style={{ fontSize: s.px }}
            >
              {s.sample}
            </p>
            <span className="text-ink-500 shrink-0 font-mono text-[10px]">
              {s.role}
            </span>
          </div>
        ))}
      </div>
    </Chamber>
  );
}
