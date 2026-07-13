import { Link } from 'react-router-dom';
import { Droplets, Sparkles, Hammer, DoorOpen, Moon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Entrance to the Khaos Vault — the live reference for every design token
// and shared component in the app. No persistent sidebar: this landing
// page is the only nav surface, each card below is a self-contained
// chamber route. Dev-only, reached at /dev/vault.

interface ChamberCard {
  to: string;
  icon: LucideIcon;
  name: string;
  tagline: string;
  contains: string;
}

const CHAMBERS: ChamberCard[] = [
  {
    to: '/dev/vault/pantheon',
    icon: Moon,
    name: 'The Pantheon',
    tagline: 'Every color, named for what it descends from',
    contains: 'Nyx, Aether, Eros, Pontus, Gaia, Tartarus, Hypnos',
  },
  {
    to: '/dev/vault/wellspring',
    icon: Droplets,
    name: 'The Wellspring',
    tagline: 'Where every token is born',
    contains: 'Fonts, colors, radii, shadows',
  },
  {
    to: '/dev/vault/sigils',
    icon: Sparkles,
    name: 'The Sigils',
    tagline: 'Marks that carry meaning',
    contains: 'Status, priority, fields, dates, tags',
  },
  {
    to: '/dev/vault/forge',
    icon: Hammer,
    name: 'The Forge',
    tagline: 'Tools built for the hand',
    contains: 'Buttons, inputs, selects',
  },
  {
    to: '/dev/vault/threshold',
    icon: DoorOpen,
    name: 'The Threshold',
    tagline: 'Where the app pauses to ask',
    contains: 'Modals, empty states',
  },
];

export default function VaultIndexPage() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-10 text-center">
        <span className="text-copper-400 font-mono text-[10px] tracking-[0.2em] uppercase">
          dev only · round 1
        </span>
        <h1 className="font-serif text-ink-100 mt-2 text-3xl italic">
          The Khaos Vault
        </h1>
        <p className="text-ink-500 mx-auto mt-2 max-w-md text-sm">
          Every design token and shared component the app is built from,
          rendered live so nothing here can drift from the real code.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CHAMBERS.map(({ to, icon: Icon, name, tagline, contains }) => (
          <Link
            key={to}
            to={to}
            className="group border-ink-700 bg-ink-800/60 hover:border-copper-500/50 hover:bg-ink-800 relative flex flex-col gap-3 overflow-hidden rounded-xl border p-5 transition-colors"
          >
            <div className="border-copper-500/30 bg-copper-500/10 text-copper-400 flex h-11 w-11 items-center justify-center rounded-full border transition-colors group-hover:bg-copper-500/20">
              <Icon size={20} />
            </div>
            <div>
              <h2 className="font-serif text-ink-100 text-lg italic">
                {name}
              </h2>
              <p className="text-ink-500 text-xs">{tagline}</p>
            </div>
            <p className="text-ink-600 font-mono text-[10px]">{contains}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
