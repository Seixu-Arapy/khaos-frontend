# Working with the user

## Feature backlog tracking

Superseded the old inline-numbered-topic scheme (`1a`, `2`, `NEW`, etc. spoken in
chat) — chat-only tracking doesn't survive context compaction. Instead:

For every big feature or round of work, maintain a backlog as a published
Artifact (dark-themed HTML, not a plain-rendered .md file) — no file lives in
the repo for this; the Artifact is the canonical record. Still use the
three-character code in chat replies (see below) even though the file backing
it is gone — the code is how the user calls up an item without repeating the
whole request, independent of where the detail lives.

Record the Artifact's URL here in CLAUDE.md per feature, along with a real
description of what's actually still open — not just a title — so a future
session (or a `git log` reader) can tell what's pending without opening the
Artifact or scrolling back through chat. Update both the URL and the
description whenever the Artifact is republished or an item's status changes.

- **Round 1 — Foundations**
  Artifact: https://claude.ai/code/artifact/f86000b6-f6e2-4735-b2a9-4e063a7fdcd8
  Open:
  - `TYP` 🟡 — five-token type scale (`text-label` 10px through
    `text-display-lg` 24px) built and documented at `/dev/vault/chorus`, but
    not yet wired into any real component `text-*` class — exists only as a
    Vault reference so far.
  - `PAN` 🟡 — Pantheon page's mythology naming/copy is approved; reopened
    for a visual pass (icon size/placement, page padding) which has been
    pushed but not yet reviewed. The underlying color CSS variables
    (`--color-teal-*` etc.) and ~35+ files using them are still unrenamed —
    this item covers display only, not the real token rename.
  - `VLT` 🟡 — display name changed from "The Khaos Vault" to "Khaos Vortex"
    everywhere it's shown; route paths and internal file/component names
    were deliberately left as "vault" (ask before doing a full rename).
  - `MUS` 🟡 — Vault pulled out of `AppShell` (no sidebar/chat), replaced
    with a single corner placard + one exit mark; pushed, awaiting review.
  - `KTX` 🟡 — `ChaoticText` renamed to `KhaoticText`, fixed (see resolved
    items below), and applied to every title in the Vault; pushed, awaiting
    review.
  - `CMP` 🟢 — not started. Fold `EntityChip`/`ChangeBadge`/the badge
    components in `common/ui.tsx` into one shared `Chip` primitive. Waiting
    on `PAN` and `TYP` to settle first since it should build on finished
    tokens.

Each open item in the backlog:

- Gets a distinct **three-character keyword code**, uppercase, memorable, unique
  within the file (e.g. `FNT`, `NAV`, `PAN`). The user replies with just that
  code to call up, discuss, or act on that item — no need to repeat the whole
  request.
- Gets a **severity marker**, hospital-triage style — emoji only, don't also
  spell out the color name next to it (redundant):
  - 🔴 critical / blocking, needs immediate attention
  - 🟠 urgent, high priority
  - 🟡 standard priority
  - 🟢 low priority / nice-to-have
- Gets a **start date** (when the item was opened) and, once resolved, an
  **end date** — history is kept (see below), so both dates matter.
- Moves to a "Resolved" section (don't delete — keep history) once the user says
  **"approved"** for that code, with its end date recorded. The three-character
  code is then free to be reused for an unrelated future item.
- A new item is added when the user's message starts with **`NEW`** — assign
  the next unused code, an initial severity marker (ask if unclear), and
  today's date as the start date.
- If the user replies with a code, treat that as their call on what it refers
  to even if it doesn't exactly match the file — note the mismatch briefly
  rather than blocking on it.

Write real detail in each item's status, not a one-line stub — enough that the
user can tell what actually happened without re-reading the chat. Not a full
transcript, but not a cryptic fragment either.

## Self-verify pushes with a pull

After pushing a commit, `git pull` (or `git fetch` + compare) in this working
checkout to confirm the push actually landed on the remote branch before
telling the user it's ready — don't just trust that `git push` exiting 0 means
the state is what's expected. Do this automatically, without being asked each
time.

This is a check on *this* sandbox's checkout, not the user's local machine —
those are separate checkouts on separate hardware; there is no way to run
`git pull` on the user's computer from here. If the user is checking out the
branch locally, they still need to run their own `git pull`.
