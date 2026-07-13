# Round 1 — Foundations

Artifact: https://claude.ai/code/artifact/ba85980c-77c6-4226-b9b9-d2f053de8639

Design-system foundation pass: fonts, colors, type scale, the Khaos Vortex
dev gallery. See `/dev/vortex` (dev-only route, not linked from the real
app nav) for the live reference — everything below renders from real code,
not mockups.

## Open

- **`TYP` 🟡 Type scale (The Chorus)** — started 2026-07-13

  There was no formal type scale before this round — six text sizes in use
  across the app (10/12/14/18/24px) had been picked ad hoc, one at a time,
  with no rule connecting them.

  Rather than invent a scale from nothing, checked what the existing sizes
  already line up with: Tailwind's own default scale (`xs` 12 / `sm` 14 /
  `lg` 18 / `2xl` 24, all already in use somewhere in the app). That
  scale's own step-to-step ratios sit in the 1.11–1.33 range.

  That range isn't arbitrary — it's the same territory as small-integer
  musical ratios (Pythagoras: an octave is 2:1, a fifth is 3:2, a major
  third is 5:4), which is genuinely where the word "scale" comes from in
  both music and type systems.

  Formalized that into five named tokens: `text-label` 10px →
  `text-caption` 12px → `text-body` 14px → `text-display` 18px →
  `text-display-lg` 24px, each labeled with its ratio to the previous step.

  Built a new Vault chamber, **The Chorus**, presenting it as a "string
  graph": five horizontal bars sized proportionally, styled like plucked
  strings, with a live type specimen for each step underneath using real
  app-shaped sample text (a sprint review title, a task name, a status
  label) rather than lorem ipsum. Pushed and rendering at
  `/dev/vortex/chorus`.

  Still open: waiting on review before wiring these five tokens into
  actual component `text-*` classes app-wide — right now they exist only
  as a reference in the Vault, nothing outside it consumes them yet, so no
  visual change has landed in the real app from this item.

- **`PAN` 🟡 Pantheon page — visual pass (reopened)** — started 2026-07-13

  Two passes under one code.

  First pass (content): renamed the seven custom color families after
  primordial Greek deities descended from Khaos, matching each name to the
  color's actual role in the app rather than picking mythological names
  arbitrarily.

  `ink`→**Nyx** (night, the base every screen sits on). `fog`→**Aether**
  (the bright upper air, Nyx's opposite, used sparingly for lifted
  surfaces). `copper`→**Eros** (primordial desire — the one warm,
  saturated accent allowed to compete for attention, i.e. buttons).

  `teal`→**Pontus** (the sea — deliberately kept cool and distant from
  Eros on the hue wheel so it's never mistaken for a call to click).
  `sage`→**Gaia** (the earth — growth, the quiet "done" state).

  `rust`→**Tartarus** (the abyss — danger and errors; also where the
  hue-collision fix from the palette analysis landed, see the resolved
  contrast/hue item below). `violet`→**Hypnos** (sleep, child of Nyx — the
  quietest, least urgent signal).

  Built a dedicated **Pantheon** chamber telling each color's short story
  with circles-only swatches (explicitly no rectangular chips, per
  instruction) plus a "how they read together" section pairing real
  text-on-background contrast combinations. That content was **approved**.

  Reopened immediately under the same code for a second, purely visual
  pass: dropped the circular backgrounds behind each deity's icon,
  enlarged the icons (17px inside a 40px bordered circle → a bare 40px
  icon), moved the icon into its own left column instead of sitting
  inline before the name, and dropped the static `italic` styling on each
  deity's name (the seven headings all being slanted the same fixed way
  read as overused, unlike `KhaoticText`'s randomized italic elsewhere).

  Since the whitespace complaint was about the page generally, not just
  the icons, also trimmed the shared `Chamber` wrapper's padding
  (`pt-32/pb-32` → `pt-20/pb-24`, title bottom margin `mb-16` → `mb-10`),
  which affects every chamber page, not only this one. Pushed; awaiting
  review of the reworked layout.

  The underlying rename is still **display-only**: the actual CSS
  variable names in `index.css` (`--color-teal-*` etc.) and every
  Tailwind class referencing them across an estimated 35+ files have not
  been touched yet — that's a deliberately separate, larger, and riskier
  step being held until the naming and visual treatment are both fully
  settled.

- **`VLT` 🟡 Vault → "Khaos Vortex" rename** — started 2026-07-13

  Originally built as a single long scrolling page at `/dev/components`
  that was getting unwieldy as more sections were added — no way to jump
  to a specific section, everything loaded at once, no sense of place.

  Replaced it with a Vault: an index page listing six numbered "chambers"
  in Roman numerals (I–VI), each its own route, sharing a small,
  deliberately minimal `Chamber`/`Section`/`Swatch` chrome kit factored
  into `vaultUI.tsx` so each chamber page is mostly just its own content.
  No persistent sidebar nav inside it — the index page's list of chambers
  *is* the entire navigation system, the way a museum floor plan works
  rather than a menu bar.

  Later reconsidered the name itself: renamed the display text from "The
  Khaos Vault" to **"Khaos Vortex"** everywhere it appears — the index
  page's main heading, the corner placard on every single page (now reads
  e.g. "khaos vortex · III"), and the sample text used in the Chorus
  page's largest type-scale specimen.

  Followed up by renaming the route paths too: every URL moved from
  `/dev/vault/*` to `/dev/vortex/*` (index, all six chambers, the exit
  link back from any chamber to the index). The old `/dev/vault*` paths
  no longer resolve to anything — they fall through to the catch-all
  redirect back to the dashboard.

  Still internally named "vault" and not yet renamed: the file names
  (`VaultIndexPage.tsx`, `vaultUI.tsx`), the `MuseumFrame`/`Chamber`
  component names, and this backlog code itself (still `VLT`) — all
  purely-internal identifiers with no user-visible effect either way.
  Full internal rename available on request.

- **`MUS` 🟡 Museum chrome (no sidebar/chat)** — started 2026-07-13

  Originally the entire Vault rendered nested inside the real app's
  `AppShell` layout — meaning the task sidebar and the chat panel were
  both still visible alongside every Vault page, which directly fought
  the goal of the Vault reading as its own space rather than a page
  bolted onto the task manager.

  Fixed at the routing level: moved every Vault route in `App.tsx`
  outside the `<Route element={<AppShell />}>` wrapper entirely, so these
  pages now render completely full-bleed with zero app chrome.

  Replaced the old per-page header (an icon-in-a-circle plus a "← Back to
  the Vault" text link with an arrow icon) with a much quieter
  museum/magazine treatment: a single small-caps, widely letter-spaced
  corner placard fixed at the top-left (reads e.g. "khaos vortex · III"
  for a chamber, just "khaos vortex" on the index), and one subtle `×`
  mark fixed at the top-right as the only other interactive element on
  the page.

  The navigation model that emerged from this: a chamber page's `×` takes
  you up exactly one level, back to the Vault index; the index page's own
  `×` takes you all the way out, back to the real app's dashboard. Two
  clean, predictable levels, no ambiguity about where "exit" goes on any
  given page.

- **`KTX` 🟡 KhaoticText on all Vortex titles** — started 2026-07-13

  Renamed the `ChaoticText` component to `KhaoticText` — the file itself
  (via `git mv`, preserving history), the default export name, and both
  of its two existing real usages in the app (`KhaosLogo.tsx`'s sidebar
  wordmark, and `ChatPanel.tsx`'s "KallKhaos" chat header) all updated
  together in one pass so nothing was left referencing the old name.

  Wired the (now-fixed, see the resolved font-animation item below)
  component into every title inside the Vortex: the index page's large
  "Khaos Vortex" heading, each of the six chamber-row titles listed on
  that same index page, and every individual chamber page's own large
  heading (via the shared `Chamber` component, so all six chamber pages
  picked it up from one change).

  Later toned down: italic was a random 50/50 coin flip per character in
  the original implementation, which read as constant flicker with
  several `KhaoticText` titles visible on one screen at once. Reweighted
  the random pool so italic hits roughly 1-in-4 characters instead of
  1-in-2 — still chaotic, just not overwhelmingly so.

  Verified in a real headless-browser render before each push — confirmed
  the per-character weight and width genuinely animate on these titles,
  not just that the markup looks plausible.

- **`CMP` 🟢 Component consolidation (shared Chip primitive)** — started
  2026-07-13

  Parked since early in this round, not started.

  Right now, `EntityChip` (in the assistant/chat code), `ChangeBadge`
  (the write-confirmation diff badges), and the various badge components
  already living in `common/ui.tsx` — `StatusBadge`, `PriorityBadge`,
  `FieldBadge` — each hand-roll their own chip/pill markup and Tailwind
  classes independently, rather than all wrapping one shared `Chip`
  primitive that takes `tone`/`size` props and stays visually consistent
  by construction.

  The plan is to build that primitive once the color tokens (`PAN`) and
  type scale (`TYP`) are both fully settled, since the primitive's
  styling should be built on finished, stable tokens rather than values
  that might still shift under it mid-build.

  Lowest priority open item in this round — nothing is broken today, this
  is a structural cleanup for when new chip-like UI needs to be added.

## Resolved

- **`--font-serif` not loading** — 2026-07-13 → 2026-07-13

  The token declared `'Roboto Serif'`, a font never imported (the package
  actually installed is Roboto **Slab**). Worse, since no class used
  `font-serif`, Tailwind v4 tree-shook the variable out of the build
  entirely — it never reached the browser at all, not even as a broken
  value.

  Fixed by pointing the token at the real `'Roboto Slab Variable'` and
  switching to `@theme static`, which emits every token regardless of
  whether a class currently uses it.

- **Uppercase raw token names in gallery** — 2026-07-13 → 2026-07-13

  Token/variable names like `--font-serif` and color family names like
  `ink` were being rendered through the app's uppercase micro-label
  style, which obscures the literal (lowercase) identifier.

  Removed uppercase styling specifically from raw token/variable name
  labels; left the general section-header uppercase convention alone
  since that's a pre-existing, intentional app-wide style.

- **Realistic sample content in gallery** — 2026-07-13 → 2026-07-13

  The font specimens and "text as used today" reference were showing
  their own Tailwind class names as the literal sample text.

  Replaced with task-manager-shaped copy per font, then further replaced
  with Khaos-mythology-themed sentences on request, all roughly matched
  in character length so the fonts stay visually comparable side by side.

- **Contrast + hue fixes** — 2026-07-13 → 2026-07-13

  Computed real WCAG contrast ratios and HSL hue distances for the full
  palette (Python script, checked in-session, not eyeballed).

  Found `ink-500` as caption text failing AA at 2.94:1, fixed by raising
  its lightness from 41% to 54% (`#5b6577`→`#7a8599`, same hue).

  Found `copper` (27° hue) and `rust` (5° hue) only 22° apart at similar
  saturation — a real risk for color-blind users and quick scanning.
  Moved `rust`'s hue to 345° (`#b5483d`→`#b43c5a`), landing 42° from
  copper while staying unambiguously red — arguably a better fit for its
  new name, Tartarus, than the original.

- **`--font-body` not loading** — 2026-07-13 → 2026-07-13

  `--font-body` declared `'Inter'`, but no `@fontsource` package for it
  was ever installed, so body text was silently falling back to
  `system-ui` the entire time.

  Installed `@fontsource-variable/inter`, added the import, and pointed
  the token at the real loaded family name, `'Inter Variable'`. Confirmed
  loading via `document.fonts.check` in a real headless-browser render,
  not just by inspecting the CSS.

- **Missing nav between Vault pages** — 2026-07-13 → 2026-07-13

  Raised right after the museum-chrome redesign went in — turned out to
  be the redesign itself still mid-flight at the time, not a separate
  bug.

  Resolved once `MUS` landed: the single `×` exit control plus the index
  page's chamber list together are the complete navigation model, by
  design.

- **ChaoticText / KhaoticText not visibly stretching** — 2026-07-13 →
  2026-07-13

  Two stacked bugs.

  (1) The `family` prop defaulted to `''` (empty string) rather than
  `undefined`, and the code used `family ?? pick(FAMILIES)` — since `??`
  only falls back on `null`/`undefined`, not `''`, the random-family
  selection never actually ran. Every real usage generated the literal
  invalid class `font-`, silently inheriting whatever font was already
  ambient (Inter, which has no width axis) instead of ever switching to
  Roboto Flex.

  (2) Even after that's fixed, two of the three fonts in the original
  random rotation (Roboto Slab, Roboto Mono) turned out to have **no
  width axis at all** in their actual font files — confirmed by reading
  each package's `metadata.json` directly, not assumed.

  Fixed by dropping the family prop entirely and always using
  `font-display` (Roboto Flex Variable). Verified with a controlled test
  before shipping: the same word at extreme condensed-thin vs. extreme
  expanded-black classes measured 100px vs. 271px wide in a real
  headless render.
