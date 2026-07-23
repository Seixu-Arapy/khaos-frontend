import type { ReactNode } from 'react';
import { Moon, Sparkles, Heart, Waves, Sprout, Flame, CloudMoon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Chamber } from './vaultUI';
import KhaoticText from '../../components/common/KhaoticText';

// The Pantheon — every color family renamed after a primordial descendant
// of Khaos, told as a short story rather than a grid. Deliberately
// circles-only for color (no rectangular chips): a swatch is a coin, a
// contrast pair is two coins side by side, nothing else carries color.

interface Deity {
  name: string;
  icon: LucideIcon;
  color: string;
  role: string;
  shades: { label: string; hex: string }[];
  story: ReactNode;
}

const DEITIES: Deity[] = [
  {
    name: 'Nyx',
    icon: Moon,
    color: '#7a8599',
    role: 'Night — the ground everything else stands on',
    shades: [
      { label: '900', hex: '#161b22' },
      { label: '700', hex: '#2b3340' },
      { label: '500', hex: '#7a8599' },
      { label: '300', hex: '#aeb6c4' },
      { label: '100', hex: '#e9ecf1' },
    ],
    story: (
      <>
        Nyx came first, and the app is built the same way: every screen
        starts as her darkest shade, <b>900</b>, and nothing is drawn until
        something is placed on top of her.
      </>
    ),
  },
  {
    name: 'Aether',
    icon: Sparkles,
    color: '#e7e9e6',
    role: 'The bright upper air, Nyx&rsquo;s opposite',
    shades: [
      { label: '50', hex: '#fafaf8' },
      { label: '100', hex: '#f1f2f0' },
      { label: '200', hex: '#e7e9e6' },
    ],
    story: (
      <>
        Where Nyx is the dark the app sits on, Aether is the rare bright
        surface — used sparingly, only where something needs to feel
        lifted into the light.
      </>
    ),
  },
  {
    name: 'Eros',
    icon: Heart,
    color: '#c0793d',
    role: 'Primordial desire — the one color that pulls',
    shades: [
      { label: '50', hex: '#fbf1e7' },
      { label: '400', hex: '#d08f4e' },
      { label: '500', hex: '#c0793d' },
      { label: '600', hex: '#a6612c' },
    ],
    story: (
      <>
        Eros gets one job: make you want to click. It is the only warm,
        saturated color allowed to compete for attention — every button
        that matters is his.
      </>
    ),
  },
  {
    name: 'Pontus',
    icon: Waves,
    color: '#3a7d7a',
    role: 'The sea — a cool current, distinct from Eros',
    shades: [
      { label: '50', hex: '#eaf3f2' },
      { label: '400', hex: '#4d928e' },
      { label: '500', hex: '#3a7d7a' },
      { label: '600', hex: '#2c615f' },
    ],
    story: (
      <>
        Pontus keeps his distance from Eros on the wheel — cool where Eros
        is warm — so his signal is never mistaken for a call to click.
      </>
    ),
  },
  {
    name: 'Gaia',
    icon: Sprout,
    color: '#5b8c5a',
    role: 'The earth — growth, and things finished',
    shades: [
      { label: '50', hex: '#eef4ed' },
      { label: '500', hex: '#5b8c5a' },
      { label: '600', hex: '#477047' },
    ],
    story: (
      <>
        Gaia marks what has grown to completion — the quiet, grounded
        &ldquo;done&rdquo; among the louder colors around her.
      </>
    ),
  },
  {
    name: 'Tartarus',
    icon: Flame,
    color: '#b43c5a',
    role: 'The abyss — reserved for things going wrong',
    shades: [
      { label: '50', hex: '#fbeff2' },
      { label: '300', hex: '#dc8fa5' },
      { label: '500', hex: '#b43c5a' },
      { label: '600', hex: '#97304a' },
    ],
    story: (
      <>
        Tartarus was moved further from Eros on the wheel on purpose — an
        accent and a warning should never be one glance away from each
        other. His lighter shade, <b>300</b>, is the warning: caution is
        a milder dose of the same abyss, not a different color.
      </>
    ),
  },
  {
    name: 'Hypnos',
    icon: CloudMoon,
    color: '#7a5fa0',
    role: 'Sleep, child of Nyx — the quietest signal',
    shades: [
      { label: '50', hex: '#efeaf7' },
      { label: '400', hex: '#9478b8' },
      { label: '500', hex: '#7a5fa0' },
      { label: '600', hex: '#634b81' },
    ],
    story: (
      <>
        Hypnos speaks last and softest — used only where nothing else is
        asking for the eye at the same time.
      </>
    ),
  },
];

function Coin({
  hex,
  size = 44,
  ring,
}: {
  hex: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <div
      className="border-nyx-700 shrink-0 rounded-full border"
      style={{
        width: size,
        height: size,
        backgroundColor: hex,
        boxShadow: ring ? `0 0 0 3px ${hex}22` : undefined,
      }}
    />
  );
}

// One role per block: title + description on top, the sample itself
// rendered big in the middle (the color pair is the exhibit, so it gets
// the size), and the contrast math as a small subtitle underneath.
function ContrastPair({
  role,
  roleColor,
  bgHex,
  fgHex,
  bgLabel,
  fgLabel,
  sample,
  description,
  contrast,
}: {
  role: string;
  roleColor: string;
  bgHex: string;
  fgHex: string;
  bgLabel: string;
  fgLabel: string;
  sample: ReactNode;
  description: string;
  contrast?: string;
}) {
  return (
    <div>
      <p
        className="text-sm font-semibold tracking-wide uppercase"
        style={{ color: roleColor }}
      >
        {role}
      </p>
      <p className="text-nyx-300 max-w-prose text-sm">{description}</p>

      <div
        className="mt-3 w-fit px-6 py-3 text-3xl font-medium"
        style={{ backgroundColor: bgHex, color: fgHex }}
      >
        {sample}
      </div>

      <p className="text-nyx-600 mt-2 font-mono text-[10px]">
        {contrast ? `${contrast} · ` : ''}
        {fgLabel} on {bgLabel}
      </p>
    </div>
  );
}

export default function PantheonPage() {
  return (
    <Chamber
      index="I"
      name="The Pantheon"
      tagline="Every color, named for what it descends from"
    >
      <div className="flex flex-col gap-10">
        {DEITIES.map((d) => (
          <div key={d.name} className="relative">
            {/* Icon lives in the gutter to the left of the text column,
                pulled fully outside the flow via right-full, so the text
                itself starts flush at x=0 -- the same left edge as the
                chamber title -- instead of being pushed right by an
                inline icon column. */}
            <div className="absolute top-0 right-full flex w-24 items-start justify-end pr-4">
              <d.icon size={88} strokeWidth={1} style={{ color: d.color }} />
            </div>
            <div className="min-w-0">
              <h3 className="mb-2" style={{ color: d.color }}>
                <KhaoticText text={d.name} family="serif" className="text-3xl" />
              </h3>
              {/* max-w-prose (65ch) is relative to the font-size of the
                  element it's on, not the text inside it -- putting it on
                  a 16px-context wrapper while these paragraphs render at
                  text-xs/text-sm made them read far wider than 65 real
                  characters. Applied per-paragraph instead so each one's
                  own font-size governs its own line length. */}
              <p className="text-nyx-500 mb-3 max-w-prose text-xs">
                {d.role}
              </p>

              <p className="text-nyx-300 mb-8 max-w-prose text-sm leading-relaxed">
                {d.story}
              </p>

              <div className="flex flex-wrap items-center gap-10">
                {d.shades.map((s) => (
                  <div key={s.label} className="flex flex-col items-center gap-1">
                    <Coin hex={s.hex} ring />
                    <span className="text-nyx-600 font-mono text-[9px]">
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        <div className="mt-4">
          <h3 className="text-nyx-200 font-display mb-4 text-sm tracking-wide uppercase">
            When the gods share a screen
          </h3>
          <div className="flex flex-col gap-10">
            <ContrastPair
              role="Base"
              roleColor="#7a8599"
              bgHex="#161b22"
              fgHex="#e9ecf1"
              bgLabel="Nyx 900"
              fgLabel="Nyx 100 text"
              sample="Every screen begins in Nyx's dark."
              description="The app's default reading pair"
              contrast="14.6:1"
            />
            <ContrastPair
              role="Caption"
              roleColor="#7a8599"
              bgHex="#161b22"
              fgHex="#7a8599"
              bgLabel="Nyx 900"
              fgLabel="Nyx 500 text"
              sample="last seen in Nyx's shadow, 2m ago"
              description="Hints and metadata, after the round 1 contrast fix"
              contrast="4.65:1"
            />
            <ContrastPair
              role="Lifted"
              roleColor="#e7e9e6"
              bgHex="#f1f2f0"
              fgHex="#161b22"
              bgLabel="Aether 100"
              fgLabel="Nyx 900 text"
              sample="Aether lifts this one into the light"
              description="The rare bright surface, spent sparingly"
              contrast="15.4:1"
            />
            <ContrastPair
              role="Action"
              roleColor="#c0793d"
              bgHex="#c0793d"
              fgHex="#161b22"
              bgLabel="Eros 500"
              fgLabel="Nyx 900 text"
              sample="Create task"
              description="Eros is the action color — the only warm, saturated color allowed to compete for attention"
              contrast="4.98:1"
            />
            <ContrastPair
              role="Info"
              roleColor="#4d928e"
              bgHex="#161b22"
              fgHex="#4d928e"
              bgLabel="Nyx 900"
              fgLabel="Pontus 400 text"
              sample="Pontus logged 2h against the tide"
              description="The workhorse accent — tags, links, logged time"
              contrast="4.79:1"
            />
            <ContrastPair
              role="Quiet"
              roleColor="#9478b8"
              bgHex="#161b22"
              fgHex="#9478b8"
              bgLabel="Nyx 900"
              fgLabel="Hypnos 400 text"
              sample="scheduled for a later dream"
              description="Hypnos speaks only when nothing else does — planned, someday, asleep"
              contrast="4.64:1"
            />
            <ContrastPair
              role="Success"
              roleColor="#5b8c5a"
              bgHex="#5b8c5a"
              fgHex="#161b22"
              bgLabel="Gaia 500"
              fgLabel="Nyx 900 text"
              sample="Marked as done"
              description="Growth and completion — a distinct hue from both Eros and Tartarus"
              contrast="4.4:1"
            />
            <ContrastPair
              role="Warning"
              roleColor="#dc8fa5"
              bgHex="#dc8fa5"
              fgHex="#161b22"
              bgLabel="Tartarus 300"
              fgLabel="Nyx 900 text"
              sample="Drifting toward the abyss"
              description="Caution is a milder dose of Tartarus, not a new hue — severity reads as lightness"
              contrast="7.0:1"
            />
            <ContrastPair
              role="Danger"
              roleColor="#b43c5a"
              bgHex="#b43c5a"
              fgHex="#161b22"
              bgLabel="Tartarus 500"
              fgLabel="Nyx 900 text"
              sample="Delete project"
              description="Reads as danger, and reads as red — not Eros"
              contrast="3.08:1"
            />
          </div>
          <p className="text-nyx-300 mt-10 max-w-prose text-sm leading-relaxed">
            <b className="text-nyx-100">Warning settled:</b> caution is
            Tartarus at 300 — a lighter dose of the same abyss, so
            severity reads as lightness (which survives every kind of
            color vision) instead of a new amber hue that would sit one
            glance away from Eros. The escalation gradient is Gaia →
            Tartarus 300 → Tartarus 500: growth, drifting, gone.
          </p>
        </div>
      </div>
    </Chamber>
  );
}
