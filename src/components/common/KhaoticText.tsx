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
const STYLES = ['italic', 'not-italic'];

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateStyles(length: number, style?: string): string[] {
  return Array.from(
    { length },
    () =>
      `font-display font-${pick(WEIGHTS)} font-stretch-${pick(STRETCHES)} ${style ?? pick(STYLES)}`
  );
}

interface KhaoticTextProps {
  text?: string;
  className?: string;
  style?: string;
}

export default function KhaoticText({
  text,
  className = '',
  style = '',
}: KhaoticTextProps) {
  const [styles, setStyles] = useState(() =>
    generateStyles(text?.length ?? 0, style)
  );

  useEffect(() => {
    if (!text) return;

    const interval = setInterval(() => {
      setStyles(generateStyles(text.length, style));
    }, 1500);

    return () => clearInterval(interval);
  }, [text, style]);

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
