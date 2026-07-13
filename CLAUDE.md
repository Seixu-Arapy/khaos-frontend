# Working with the user

## Feature backlog tracking

Superseded the old inline-numbered-topic scheme (`1a`, `2`, `NEW`, etc. spoken in
chat) — chat-only tracking doesn't survive context compaction. Instead:

The canonical record is a custom-HTML dark-themed Artifact (not a repo file,
not a plain-rendered .md — a hand-built table). Republish to the same URL on
every update rather than minting a new one. This has flipped a few times
already (repo file vs. Artifact, table vs. list) — **this is the settled
answer, don't revisit the format again without being asked.**

Format: a table, one row per item, columns for marker/code/title/description
/dates. Inside the description cell, write in very short fragments — a
handful of words per line, `<br>` after nearly every one, blank `<br><br>`
between thoughts. Do not write flowing paragraphs or multi-sentence lines
inside a cell; dense text in a narrow cell is what this format exists to
avoid. Group into an "Open" table and a "Resolved" table, each with its own
`<h2>`.

There is no backing repo file for this — the source of truth lives only in
the published Artifact. (An earlier iteration tried `docs/backlog/*.md`
files, both with and without a parallel Artifact; abandoned. If old files
under `docs/backlog/` are ever found, they're stale — safe to delete, not
authoritative.)

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
transcript, but not a cryptic fragment either. Break each description into
several short paragraphs (2-4 sentences, blank line between) rather than one
dense block — a single wall of text is hard to scan even when the content is
good.

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
