import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

// Shared chrome for every chamber of the Khaos Vault (/dev/vault/*) — the
// live, real-component reference for the app's design system. Kept
// deliberately small: a chamber is just a themed heading plus Section/
// Swatch, no framework of its own.

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-ink-700 bg-ink-800/40 mb-8 rounded-lg border p-5">
      <h2 className="text-ink-200 font-display mb-4 text-sm tracking-wide uppercase">
        {title}
      </h2>
      <div className="flex flex-wrap items-center gap-4">{children}</div>
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
    <div className="flex flex-col items-start gap-1.5">
      <span className="text-ink-500 font-mono text-[10px]">{label}</span>
      {children}
    </div>
  );
}

interface ChamberProps {
  glyph: ReactNode;
  name: string;
  tagline: string;
  children: ReactNode;
}

export function Chamber({ glyph, name, tagline, children }: ChamberProps) {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link
        to="/dev/vault"
        className="text-ink-500 hover:text-ink-200 mb-6 inline-flex items-center gap-1.5 text-xs transition-colors"
      >
        <ArrowLeft size={13} />
        Back to the Vault
      </Link>
      <div className="mb-8 flex items-center gap-4">
        <div className="border-copper-500/40 bg-copper-500/10 text-copper-400 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border">
          {glyph}
        </div>
        <div>
          <h1 className="font-serif text-ink-100 text-2xl italic">{name}</h1>
          <p className="text-ink-500 text-xs">{tagline}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
