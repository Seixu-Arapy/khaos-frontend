import { Link } from 'react-router-dom';
import { MuseumFrame } from './vaultUI';
import KhaosIcon from '../../components/common/KhaosIcon';

// Entrance to the Khaos Vault — full-bleed, no sidebar, no chat, no nav
// menu. Wayfinding is a single corner placard and one exit mark; moving
// between chambers happens by reading the list below, the way a museum
// floor plan works, not a persistent menu bar.
//
// Deliberately static, not KhaoticText, on this page — the chaos effect is
// reserved for the moment you're actually inside a chamber (its own <h1>,
// via Chamber), not the index listing them.

interface ChamberEntry {
  to: string;
  index: string;
  name: string;
  tagline: string;
  contains: string;
}

const CHAMBERS: ChamberEntry[] = [
  {
    to: '/dev/vortex/pantheon',
    index: 'I',
    name: 'The Pantheon',
    tagline: 'Every color, named for what it descends from',
    contains: 'Nyx · Aether · Eros · Pontus · Gaia · Tartarus · Hypnos',
  },
  {
    to: '/dev/vortex/chorus',
    index: 'II',
    name: 'The Chorus',
    tagline: 'The type scale, sung as harmonic intervals',
    contains: 'Label · Caption · Body · Display · Display-lg',
  },
  {
    to: '/dev/vortex/wellspring',
    index: 'III',
    name: 'The Wellspring',
    tagline: 'Where every token is born',
    contains: 'Fonts · Colors · Radii · Shadows',
  },
  {
    to: '/dev/vortex/sigils',
    index: 'IV',
    name: 'The Sigils',
    tagline: 'Marks that carry meaning',
    contains: 'Status · Priority · Fields · Dates · Tags',
  },
  {
    to: '/dev/vortex/forge',
    index: 'V',
    name: 'The Forge',
    tagline: 'Tools built for the hand',
    contains: 'Buttons · Inputs · Selects',
  },
  {
    to: '/dev/vortex/threshold',
    index: 'VI',
    name: 'The Threshold',
    tagline: 'Where the app pauses to ask',
    contains: 'Modals · Empty states',
  },
];

export default function VaultIndexPage() {
  return (
    <MuseumFrame eyebrow="khaos vortex">
      <div className="mx-auto max-w-2xl px-6 pt-40 pb-32">
        <div className="mb-24 text-center">
          <KhaosIcon
            size="h-24 w-24"
            fontSize="text-8xl"
            color="text-ink-700"
            spin
            className="mx-auto mb-2"
          />
          <h1 className="font-serif text-ink-100 text-4xl">Khaos Vortex</h1>
          <p className="text-ink-600 mx-auto mt-4 max-w-sm font-mono text-[11px] tracking-widest uppercase">
            every token, every component, exactly as it renders
          </p>
        </div>

        <div className="flex flex-col">
          {CHAMBERS.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="group border-ink-800 hover:border-ink-600 flex items-start gap-6 border-t py-8 transition-colors duration-300 last:border-b"
            >
              <span className="text-ink-700 group-hover:text-ink-400 w-20 shrink-0 font-serif text-6xl leading-none transition-colors duration-300">
                {c.index}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-ink-200 group-hover:text-ink-100 text-2xl transition-colors duration-300">
                  {c.name}
                </h2>
                <p className="text-ink-600 mt-1 text-sm">{c.tagline}</p>
                <p className="text-ink-700 mt-2 font-mono text-[10px] tracking-wide">
                  {c.contains}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </MuseumFrame>
  );
}
