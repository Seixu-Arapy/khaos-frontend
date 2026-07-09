import { useEffect, useState } from 'react';

const FAMILIES = ['display', 'serif', 'mono'];
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
const STYLES = ['italic', 'no-italic'];

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateStyles(
  length: number,
  family?: string,
  style?: string
): string[] {
  return Array.from(
    { length },
    () =>
      `font-${family ?? pick(FAMILIES)} font-${pick(WEIGHTS)} font-stretch-${pick(STRETCHES)} ${style ?? pick(STYLES)}`
  );
}

interface ChaoticTextProps {
  text?: string;
  className?: string;
  family?: string;
  style?: string;
}

export default function ChaoticText({
  text,
  className = '',
  family = '',
  style = '',
}: ChaoticTextProps) {
  const [styles, setStyles] = useState(() =>
    generateStyles(text?.length ?? 0, family, style)
  );

  useEffect(() => {
    if (!text) return;

    const interval = setInterval(() => {
      setStyles(generateStyles(text.length, family));
    }, 1500);

    return () => clearInterval(interval);
  }, [text, family]);

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
