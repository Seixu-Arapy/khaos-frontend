import clsx from 'clsx';
import { Asterisk } from 'lucide-react';

interface KhaosIconProps {
  /** Icon container size (e.g., 'h-6 w-6', 'h-13 w-13' or custom Tailwind utility classes) */
  size?: string;
  /** Asterisk glyph size, expressed the same way callers already pass it
   * (a Tailwind text-size class) -- converted to a pixel size for the
   * underlying SVG icon via TEXT_SIZE_PX below. */
  fontSize?: string;
  /** Color of the asterisk character (e.g., 'text-eros-400') */
  color?: string;
  /** Background color of the circle (e.g., 'bg-nyx-700', 'bg-eros-500/15') */
  bgColor?: string;
  /** Determines whether the icon should rotate continuously */
  spin?: boolean;
  /** Extra classes */
  className?: string;
}

// Standard Tailwind text-size scale, so any fontSize value a caller passes
// resolves to a real pixel size for the icon.
const TEXT_SIZE_PX: Record<string, number> = {
  'text-xs': 12,
  'text-sm': 14,
  'text-base': 16,
  'text-lg': 18,
  'text-xl': 20,
  'text-2xl': 24,
  'text-3xl': 30,
  'text-4xl': 36,
  'text-5xl': 48,
  'text-6xl': 60,
  'text-7xl': 72,
  'text-8xl': 96,
  'text-9xl': 128,
};

export default function KhaosIcon({
  size = 'h-7 w-7',
  fontSize = 'text-xl',
  color = 'text-eros-400',
  bgColor = 'bg-transparent',
  spin = false,
  className = '',
}: KhaosIconProps) {
  const iconPx = TEXT_SIZE_PX[fontSize] ?? 20;

  return (
    <div
      className={clsx(
        // Was a "✷" text character -- a font glyph's own metrics box
        // isn't guaranteed symmetric around its visual shape (confirmed:
        // still spun visibly off-center even once this container and
        // the inner span were both made perfectly square). A lucide SVG
        // icon's path is drawn around a fixed, literal viewBox center,
        // so rotating it rotates around the shape's actual visual
        // center -- not dependent on font rendering at all.
        'flex shrink-0 items-center justify-center rounded-full select-none',
        size,
        bgColor,
        className
      )}
    >
      {/* Spin lives on this inner wrapper, not the outer div -- some
          callers also pass animate-pulse via className on the outer div
          (the Vortex hero icon spins and pulses at once), and both would
          collide fighting over the same `animation` property on one
          element. */}
      <span
        className={clsx(
          'flex items-center justify-center',
          spin ? 'animate-spin-slow' : ''
        )}
      >
        <Asterisk size={iconPx} className={color} strokeWidth={2.5} />
      </span>
    </div>
  );
}
