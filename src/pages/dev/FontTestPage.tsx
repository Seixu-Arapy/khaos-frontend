import { MuseumFrame } from './vaultUI';

// FNT -- a live test to answer "is Roboto Flex vs Inter redundant?"
// Not a numbered chamber (no roman numeral, no chamber nav entry) --
// this is a scratch comparison page, meant to be deleted or promoted
// once the question is settled, not a permanent fixture like the six
// chambers.
//
// Runs the four tests recommended in the FNT backlog item:
// 1. Same body-size sentence, Inter vs Flex, at 12px/14px.
// 2. Flex at a narrower font-stretch + normal weight, to see if it
//    reads as "a body font" rather than a shrunk display font.
// 3. Real UI context (task row, sidebar item, chat bubble), not an
//    isolated specimen.
// 4. (Decision step, not rendered here -- see the backlog item.)

const SENTENCE =
  'Rework onboarding checklist copy before the sprint review tomorrow.';

function ComparisonRow({ px }: { px: number }) {
  return (
    <div className="border-ink-700 border-t pt-6">
      <span className="text-ink-500 mb-3 block font-mono text-[10px]">
        {px}px
      </span>
      <div className="flex flex-col gap-4">
        <div>
          <p
            className="text-ink-100"
            style={{ fontFamily: "'Inter Variable', system-ui, sans-serif", fontSize: px }}
          >
            {SENTENCE}
          </p>
          <span className="text-ink-600 font-mono text-[10px]">
            Inter Variable · normal
          </span>
        </div>
        <div>
          <p
            className="font-display text-ink-100"
            style={{ fontSize: px }}
          >
            {SENTENCE}
          </p>
          <span className="text-ink-600 font-mono text-[10px]">
            Roboto Flex Variable · normal
          </span>
        </div>
        <div>
          <p
            className="font-display text-ink-100 font-stretch-condensed"
            style={{ fontSize: px }}
          >
            {SENTENCE}
          </p>
          <span className="text-ink-600 font-mono text-[10px]">
            Roboto Flex Variable · font-stretch-condensed
          </span>
        </div>
      </div>
    </div>
  );
}

function ContextPair({
  label,
  children,
}: {
  label: string;
  children: (fontClassName: string, fontFamily?: string) => React.ReactNode;
}) {
  return (
    <div className="border-ink-700 border-t pt-6">
      <span className="text-ink-500 mb-3 block font-mono text-[10px]">
        {label}
      </span>
      <div className="flex flex-col gap-4">
        <div>
          {children('', "'Inter Variable', system-ui, sans-serif")}
          <span className="text-ink-600 mt-1 block font-mono text-[10px]">
            Inter Variable
          </span>
        </div>
        <div>
          {children('font-display')}
          <span className="text-ink-600 mt-1 block font-mono text-[10px]">
            Roboto Flex Variable
          </span>
        </div>
      </div>
    </div>
  );
}

export default function FontTestPage() {
  return (
    <MuseumFrame exitTo="/dev/vortex">
      <div className="mx-auto max-w-4xl px-6 pt-16 pb-12">
        <div className="mb-14 max-w-4xl">
          <h1 className="font-serif text-ink-100 text-3xl">
            Font test: Roboto Flex vs Inter
          </h1>
          <p className="text-ink-400 mt-2 font-mono text-[11px] tracking-widest uppercase">
            FNT — is a second sans face actually earning its keep?
          </p>
        </div>

        <div className="mb-10">
          <h2 className="text-ink-200 font-display mb-6 text-sm tracking-wide uppercase">
            1 &amp; 2 — direct comparison, same sentence
          </h2>
          <div className="flex flex-col gap-6">
            <ComparisonRow px={12} />
            <ComparisonRow px={14} />
          </div>
        </div>

        <div className="mb-10">
          <h2 className="text-ink-200 font-display mb-6 text-sm tracking-wide uppercase">
            3 — in real UI context, not isolated
          </h2>
          <div className="flex flex-col gap-6">
            <ContextPair label="Task row">
              {(fontClassName, fontFamily) => (
                <div className="border-ink-700 bg-ink-800/40 flex items-center gap-2.5 rounded-md border px-2 py-1.5">
                  <span className="border-ink-600 h-3.5 w-3.5 shrink-0 rounded-full border" />
                  <span
                    className={`text-ink-100 text-sm font-medium ${fontClassName}`}
                    style={fontFamily ? { fontFamily } : undefined}
                  >
                    Rework onboarding checklist copy
                  </span>
                </div>
              )}
            </ContextPair>

            <ContextPair label="Sidebar nav item">
              {(fontClassName, fontFamily) => (
                <div className="bg-ink-800 flex w-56 items-center gap-2.5 rounded-md px-2.5 py-1.5">
                  <span className="bg-ink-600 h-4 w-4 shrink-0 rounded-full" />
                  <span
                    className={`text-ink-100 text-sm font-medium ${fontClassName}`}
                    style={fontFamily ? { fontFamily } : undefined}
                  >
                    Routines
                  </span>
                </div>
              )}
            </ContextPair>

            <ContextPair label="Chat bubble">
              {(fontClassName, fontFamily) => (
                <div className="border-ink-700 bg-ink-800 max-w-[85%] rounded-lg border p-3.5">
                  <p
                    className={`text-ink-100 text-sm leading-relaxed ${fontClassName}`}
                    style={fontFamily ? { fontFamily } : undefined}
                  >
                    Moved 3 tasks to next sprint and flagged the design
                    review as blocked -- want me to notify the team?
                  </p>
                </div>
              )}
            </ContextPair>

            <ContextPair label="Caption / metadata (12px)">
              {(fontClassName, fontFamily) => (
                <span
                  className={`text-ink-500 text-xs ${fontClassName}`}
                  style={fontFamily ? { fontFamily, fontSize: 12 } : { fontSize: 12 }}
                >
                  Last synced 2 minutes ago
                </span>
              )}
            </ContextPair>
          </div>
        </div>

        <div className="border-ink-700 border-t pt-6">
          <h2 className="text-ink-200 font-display mb-3 text-sm tracking-wide uppercase">
            4 — decision
          </h2>
          <p className="text-ink-300 max-w-prose text-sm leading-relaxed">
            If Roboto Flex (normal or condensed) reads acceptably at body
            sizes above, the recommendation is to drop the{' '}
            <code className="text-copper-400 font-mono text-xs">
              @fontsource-variable/inter
            </code>{' '}
            package, point{' '}
            <code className="text-copper-400 font-mono text-xs">
              --font-body
            </code>{' '}
            at Roboto Flex Variable, and remeasure bundle size saved. See
            the <code className="text-copper-400 font-mono text-xs">FNT</code>{' '}
            backlog item for the full writeup.
          </p>
        </div>
      </div>
    </MuseumFrame>
  );
}
