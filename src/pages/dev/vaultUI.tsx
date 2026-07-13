import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import KhaoticText from '../../components/common/KhaoticText';

// Shared chrome for the Khaos Vault (/dev/vault/*) — deliberately outside
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

      <div className="text-ink-700 fixed top-6 left-6 z-10 font-mono text-[10px] tracking-[0.35em] uppercase">
        {eyebrow}
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
    <section className="border-ink-800 mb-10 border-t pt-6">
      <h2 className="text-ink-600 mb-5 font-mono text-[10px] tracking-[0.25em] uppercase">
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
      <span className="text-ink-600 font-mono text-[10px]">{label}</span>
      {children}
    </div>
  );
}

interface ChamberProps {
  index: string;
  name: string;
  tagline: string;
  children: ReactNode;
}

export function Chamber({ index, name, tagline, children }: ChamberProps) {
  return (
    <MuseumFrame eyebrow={`khaos vortex · ${index}`} exitTo="/dev/vault">
      <div className="mx-auto max-w-3xl px-6 pt-20 pb-24">
        <div className="mb-10">
          <h1 className="text-ink-100">
            <KhaoticText text={name} className="text-3xl" />
          </h1>
          <p className="text-ink-600 mt-2 font-mono text-[11px] tracking-widest uppercase">
            {tagline}
          </p>
        </div>
        {children}
      </div>
    </MuseumFrame>
  );
}
