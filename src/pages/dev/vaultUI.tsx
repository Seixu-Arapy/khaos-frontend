import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import KhaosIcon from '../../components/common/KhaosIcon';
import KhaoticText from '../../components/common/KhaoticText';

// Shared chrome for the Khaos Vault (/dev/vortex/*) — deliberately outside
// AppShell (no sidebar, no chat, no nav bar). The only wayfinding is a
// corner placard, museum-label style, and one subtle exit mark. Moving
// between chambers happens through the index page's cards, not a menu.

export function MuseumFrame({
  eyebrow,
  exitTo = '/',
  children,
}: {
  eyebrow: string;
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

      <Link
        to="/dev/vortex"
        className="text-ink-700 hover:text-ink-300 fixed top-6 left-6 z-10 flex items-center gap-2 font-mono text-[10px] tracking-[0.35em] uppercase transition-colors duration-300"
      >
        <KhaosIcon
          size="h-7 w-7"
          fontSize="text-2xl"
          color="text-ink-400"
          spin
          className="animate-pulse"
        />
        {eyebrow}
      </Link>

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
  // Opt-in only -- most chambers use a plain static title. Chorus is the
  // one exception right now (per request), so this stays a per-chamber
  // switch rather than a blanket default.
  chaotic?: boolean;
}

export function Chamber({
  index,
  name,
  tagline,
  children,
  chaotic = false,
}: ChamberProps) {
  return (
    <MuseumFrame eyebrow={`khaos vortex · ${index}`} exitTo="/dev/vortex">
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
