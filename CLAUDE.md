# Working with the user

## Feature backlog tracking

Superseded the old inline-numbered-topic scheme (`1a`, `2`, `NEW`, etc. spoken in
chat) — chat-only tracking doesn't survive context compaction. Instead:

For every big feature or round of work, maintain a backlog file at
`docs/backlog/<feature-slug>.md` (create `docs/backlog/` if it doesn't exist yet).
That file is the single source of truth for open items in that feature — restate
it in chat when useful, but the file is canonical, not the chat.

Each open item in the file:

- Gets a distinct **three-character keyword code**, uppercase, memorable, unique
  within the file (e.g. `FNT`, `NAV`, `PAN`). The user replies with just that
  code to call up, discuss, or act on that item — no need to repeat the whole
  request.
- Gets a **severity color**, hospital-triage style:
  - 🔴 **RED** — critical / blocking, needs immediate attention
  - 🟠 **ORANGE** — urgent, high priority
  - 🟡 **YELLOW** — standard priority
  - 🟢 **GREEN** — low priority / nice-to-have
- Moves to a "Resolved" section (don't delete — keep history) once the user says
  **"approved"** for that code. The three-character code is then free to be
  reused for an unrelated future item.
- A new item is added when the user's message starts with **`NEW`** — assign
  the next unused code and an initial severity color (ask if unclear).
- If the user replies with a code, treat that as their call on what it refers
  to even if it doesn't exactly match the file — note the mismatch briefly
  rather than blocking on it.

Keep the backlog file itself terse: a table or list of `code · color · title ·
one-line status`, not a transcript of the conversation.
