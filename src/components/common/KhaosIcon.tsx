import clsx from 'clsx';

interface KhaosIconProps {
  /** Icon container size (e.g., 'h-6 w-6', 'h-13 w-13' or custom Tailwind utility classes) */
  size?: string;
  /** Asterisk character size (Tailwind text classes, e.g., 'text-lg', 'text-2xl') */
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

export default function KhaosIcon({
  size = 'h-7 w-7',
  fontSize = 'text-xl',
  color = 'text-eros-400',
  bgColor = 'bg-transparent',
  spin = false,
  className = '',
}: KhaosIconProps) {
  return (
    <div
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-full text-center font-bold select-none',
        size,
        bgColor,
        className
      )}
      style={{ lineHeight: 0 }} // Neutralizes line height to ensure perfect geometric centering
    >
      <span
        className={clsx(
          // flex + h-full/w-full instead of a bare inline-block: the
          // glyph's own font-metrics box isn't symmetric around its
          // visual shape, so a spin centered on that box (via inline
          // sizing) rotated visibly off-axis. This span is now exactly
          // as square as the (always-square) outer container, so
          // rotation and the outer's own animate-pulse (used together
          // on the Vortex hero icon) both read as centered.
          'flex h-full w-full items-center justify-center',
          fontSize,
          color,
          spin ? 'animate-spin-slow' : ''
        )}
      >
        ✷
      </span>
    </div>
  );
}
