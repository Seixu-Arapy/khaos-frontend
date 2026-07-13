# Round 1 — Foundations

Design-system foundation pass: fonts, colors, type scale, the Khaos Vault
dev gallery. See `/dev/vault` (dev-only route) for the live reference.

## Open

| code  | color     | title                              | status |
|-------|-----------|-------------------------------------|--------|
| `TYP` | 🟡 YELLOW | Type scale (The Chorus)             | Pushed — Pythagorean-ratio scale built as `/dev/vault/chorus`, awaiting review |
| `PAN` | 🟡 YELLOW | Khaos naming + Pantheon page        | Pushed — mythology color names + `/dev/vault/pantheon`, awaiting review |
| `VLT` | 🟡 YELLOW | Vault restructure (chambers)        | Pushed — index + 6 chamber routes replacing the single-page gallery |
| `MUS` | 🟡 YELLOW | Museum chrome (no sidebar/chat)     | Pushed — Vault pulled out of AppShell, corner placard + single exit |
| `CTX` | 🟡 YELLOW | ChaoticText font animation fix      | Pushed — fixed the `family` default bug; confirmed stretching in a real render |
| `CMP` | 🟢 GREEN  | Component consolidation (Chip)      | Parked — fold `EntityChip`/`ChangeBadge` styling into one shared primitive, waiting on the above to land first |

## Resolved

| code  | title                                    | notes |
|-------|-------------------------------------------|-------|
| —     | `--font-serif` not loading                | Pointed at real `Roboto Slab Variable`, switched to `@theme static` |
| —     | Uppercase raw token names in gallery      | Removed uppercase styling from raw var/token labels |
| —     | Realistic sample content in gallery       | Real task-manager copy instead of class names as sample text |
| —     | Contrast + hue fixes                      | `ink-500` lightened for AA; `rust` hue moved from 5°→345° away from `copper` |
| —     | `--font-body` not loading                 | Actually imported Inter, pointed token at `Inter Variable` |
| —     | Missing nav between Vault pages           | Resolved by `MUS` — single exit mark, index list |
