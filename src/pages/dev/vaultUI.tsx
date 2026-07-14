import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import KhaosIcon from '../../components/common/KhaosIcon';
import KhaoticText from '../../components/common/KhaoticText';

// Shared chrome for the Khaos Vault (/dev/vortex/*) — deliberately outside
// AppShell (no sidebar, no chat, no nav bar). The only wayfinding is a
// corner placard (logo + roman-numeral nav) and one subtle exit mark.
// Kept in sync by hand with VaultIndexPage's own CHAMBERS list -- six
// fixed items, low churn, not worth a shared-import refactor yet.
const CHAMBER_NAV = [
  { index: 'I', name: 'The Pantheon', to: '/dev/vortex/pantheon' },
  { index: 'II', name: 'The Chorus', to: '/dev/vortex/chorus' },
  { index: 'III', name: 'The Wellspring', to: '/dev/vortex/wellspring' },
  { index: 'IV', name: 'The Sigils', to: '/dev/vortex/sigils' },
  { index: 'V', name: 'The Forge', to: '/dev/vortex/forge' },
  { index: 'VI', name: 'The Threshold', to: '/dev/vortex/threshold' },
];

export function MuseumFrame({
  currentIndex,
  exitTo = '/',
  children,
}: {
  currentIndex?: string;
  exitTo?: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-ink-900 relative min-h-screen">
      <Link
        to={exitTo}
        aria-label="Exit"
        className="text-ink-700 hover:text-ink-300 fixed top-6 right-6 z-10 transition-colors duration-300"
      >
        <X size={18} strokeWidth={1.5} />
      </Link>

      <div className="fixed top-6 left-6 z-10 flex items-center gap-4">
        <Link
          to="/dev/vortex"
          className="text-ink-700 hover:text-ink-300 flex items-center gap-2 font-mono text-[10px] tracking-[0.35em] uppercase transition-colors duration-300"
        >
          <KhaosIcon
            size="h-7 w-7"
            fontSize="text-2xl"
            color="text-ink-400"
            spin
            className="animate-pulse"
          />
          khaos vortex
        </Link>

        <nav className="flex items-center gap-3">
          {CHAMBER_NAV.map((c) => (
            <div key={c.index} className="group relative">
              <Link
                to={c.to}
                className={`font-mono text-xs transition-colors duration-300 ${
                  c.index === currentIndex
                    ? 'text-ink-300'
                    : 'text-ink-700 hover:text-ink-400'
                }`}
              >
                {c.index}
              </Link>
              <span className="text-ink-300 bg-ink-800 border-ink-700 pointer-events-none absolute top-full left-1/2 mt-2 -translate-x-1/2 rounded border px-2 py-1 text-xs whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                {c.name}
              </span>
            </div>
          ))}
        </nav>
      </div>

      {children}
    </div>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-ink-700 mb-10 border-t pt-6">
      <h2 className="text-ink-400 mb-5 font-mono text-[10px] tracking-[0.25em] uppercase">
        {title}
      </h2>
      <div className="flex flex-wrap items-center gap-5">{children}</div>
    </section>
  );
}

export function Swatch({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2">
      <span className="text-ink-400 font-mono text-[10px]">{label}</span>
      {children}
    </div>
  );
}

interface ChamberProps {
  index: string;
  name: string;
  tagline: string;
  children: ReactNode;
  // Every chamber title runs KhaoticText by default now -- kept as a
  // prop (rather than removed) only in case a future chamber needs to
  // opt out.
  chaotic?: boolean;
}

export function Chamber({
  index,
  name,
  tagline,
  children,
  chaotic = true,
}: ChamberProps) {
  return (
    <MuseumFrame currentIndex={index} exitTo="/dev/vortex">
      <div className="mx-auto max-w-5xl px-6 pt-28 pb-32">
        <div className="mb-14">
          <h1 className="font-serif text-ink-100 text-3xl">
            {chaotic ? (
              <KhaoticText text={name} family="serif" className="text-3xl" />
            ) : (
              name
            )}
          </h1>
          <p className="text-ink-400 mt-2 font-mono text-[11px] tracking-widest uppercase">
            {tagline}
          </p>
        </div>
        {children}
      </div>
    </MuseumFrame>
  );
}
