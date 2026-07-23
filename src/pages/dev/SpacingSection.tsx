// SPC — the spacing ladder, derived from a real audit of the app's own
// classes (dev pages excluded), not invented. The six roles below cover
// the overwhelming majority of actual usage; the half-steps (10px/14px:
// gap-2.5, px-3.5, ...) appeared ~40x and read as indecision between
// rungs, flagged for normalization rather than promoted to the ladder.

interface SpacingRole {
  name: string;
  px: number;
  tw: string;
  rule: string;
  usedIn: string;
  deity: string;
  color: string;
}

// Deity colors borrowed from The Pantheon, same logic as The Chorus and
// the radii/shadow guide -- one system across chambers. Assignment
// follows size order along the same arc the type scale uses.
const SPACING_ROLES: SpacingRole[] = [
  {
    name: 'hairline',
    px: 2,
    tw: '0.5',
    rule: 'A caption hugging the text it belongs to.',
    usedIn: 'mt-0.5 under task names, py-0.5 inside chips',
    deity: 'Hypnos',
    color: '#9478b8',
  },
  {
    name: 'tight',
    px: 4,
    tw: '1',
    rule: 'Label to its element, icon to its text.',
    usedIn: 'mb-1 (the single most common margin), gap-1',
    deity: 'Aether',
    color: '#f1f2f0',
  },
  {
    name: 'snug',
    px: 6,
    tw: '1.5',
    rule: 'Inside controls — a button’s own breathing room.',
    usedIn: 'gap-1.5, py-1.5 on inputs and buttons',
    deity: 'Nyx',
    color: '#aeb6c4',
  },
  {
    name: 'element',
    px: 8,
    tw: '2',
    rule: 'The default distance between things inside one component.',
    usedIn: 'gap-2 (the most common gap), px-2, py-2',
    deity: 'Pontus',
    color: '#4d928e',
  },
  {
    name: 'group',
    px: 12,
    tw: '3',
    rule: 'Between related items — list rows, heading to its content.',
    usedIn: 'gap-3, space-y-3, mb-3 after headings',
    deity: 'Gaia',
    color: '#5b8c5a',
  },
  {
    name: 'block',
    px: 16,
    tw: '4',
    rule: 'A card or panel’s padding — content to its frame.',
    usedIn: 'p-4, px-4 on cards and modal bodies',
    deity: 'Eros',
    color: '#d08f4e',
  },
  {
    name: 'shell',
    px: 24,
    tw: '6',
    rule: 'Page and modal shells — the outermost frame.',
    usedIn: 'px-6 page containers, py-5 section shells',
    deity: 'Tartarus',
    color: '#b43c5a',
  },
];

export default function SpacingSection() {
  return (
    <section className="mt-14">
      <h2 className="text-nyx-200 font-display mb-3 text-sm tracking-wide uppercase">
        The spacing ladder
      </h2>
      <p className="text-nyx-300 mb-8 max-w-prose text-sm leading-relaxed">
        Not invented — audited. These seven steps already carry ~80% of
        every gap, margin, and padding in the app; the ladder just names
        what the code was already doing. Each bar below is the real
        distance, shown between two elements.
      </p>

      <div className="flex flex-col gap-8">
        {SPACING_ROLES.map((r) => (
          <div key={r.name}>
            <div className="mb-1 flex items-baseline gap-2">
              <span
                className="font-mono text-sm font-semibold"
                style={{ color: r.color }}
              >
                {r.name}
              </span>
              <span className="text-nyx-600 font-mono text-[10px]">
                {r.px}px · Tailwind {r.tw} · {r.deity}
              </span>
            </div>
            <p className="text-nyx-300 mb-1.5 max-w-prose text-xs leading-relaxed">
              {r.rule}
            </p>
            {/* The demo: two blocks separated by exactly this step, the
                gap itself tinted so the distance is the visible thing. */}
            <div className="flex items-center">
              <div className="bg-nyx-700 h-6 w-24" />
              <div
                className="h-6"
                style={{ width: r.px, backgroundColor: `${r.color}66` }}
              />
              <div className="bg-nyx-700 h-6 w-24" />
            </div>
            <p className="text-nyx-600 mt-1 font-mono text-[10px]">
              {r.usedIn}
            </p>
          </div>
        ))}
      </div>

      <p className="text-nyx-300 mt-10 max-w-prose text-sm leading-relaxed">
        <b className="text-nyx-100">The noise:</b> the half-steps — 10px
        and 14px (<code className="text-eros-400 font-mono text-xs">gap-2.5</code>,{' '}
        <code className="text-eros-400 font-mono text-xs">px-3.5</code>{' '}
        and friends) — appear ~40 times and sit between rungs. They read
        as indecision, not intent: candidates to normalize onto the
        ladder, one page at a time, rather than a new rung.
      </p>
    </section>
  );
}
