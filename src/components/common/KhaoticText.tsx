import { useEffect, useState } from 'react';

// Only 'display' (Roboto Flex Variable) actually ships width/weight/slant
// axes — Roboto Slab and Roboto Mono are loaded weight-only, so any
// character assigned to them can never stretch or lean, which is what
// made this component read as "broken" rather than "chaotic."
const WEIGHTS = [
  'thin',
  'extralight',
  'light',
  'normal',
  'medium',
  'semibold',
  'bold',
  'extrabold',
  'black',
];
const STRETCHES = [
  'ultra-condensed',
  'extra-condensed',
  'condensed',
  'semi-condensed',
  'normal',
  'semi-expanded',
  'expanded',
  'extra-expanded',
  'ultra-expanded',
];
// Weighted so italic is the occasional accent, not half of every title —
// a 50/50 split read as constant flicker across pages with several
// KhaoticText titles on screen at once.
const STYLES = ['italic', 'not-italic', 'not-italic', 'not-italic'];

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 'serif' (Roboto Slab Variable) has no width axis, so font-stretch-* is a
// no-op on it — weight still animates, and font-style: italic still shows
// as a browser-synthesized ("faux") slant since Slab has no italic face
// either. Chaotic, just a narrower range than 'display'.
function generateStyles(
  length: number,
  family: 'display' | 'serif',
  style?: string
): string[] {
  return Array.from(
    { length },
    () =>
      `font-${family} font-${pick(WEIGHTS)} font-stretch-${pick(STRETCHES)} ${style ?? pick(STYLES)}`
  );
}

interface KhaoticTextProps {
  text?: string;
  className?: string;
  family?: 'display' | 'serif';
  style?: string;
}

export default function KhaoticText({
  text,
  className = '',
  family = 'display',
  style = '',
}: KhaoticTextProps) {
  const [styles, setStyles] = useState(() =>
    generateStyles(text?.length ?? 0, family, style)
  );

  useEffect(() => {
    if (!text) return;

    const interval = setInterval(() => {
      setStyles(generateStyles(text.length, family, style));
    }, 1500);

    return () => clearInterval(interval);
  }, [text, family, style]);

  if (!text) return null;

  return (
    <span className={`select-none ${className}`}>
      {text.split('').map((char, index) => {
        if (char === ' ') return <span key={index}>&nbsp;</span>;

        return (
          <span
            key={`${char}-${index}`}
            className={`${styles[index] ?? ''} transition-all duration-500`}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}
