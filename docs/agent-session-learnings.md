# Agent session learnings (corp-civ-idle)

Living notes from Chris playtests and corrections. **Append after sessions** so new chats avoid repeating the same mistakes. Read with [`AGENTS.md`](../AGENTS.md) and [`docs/save-integrity.md`](save-integrity.md).

---

## Environment & shell (2026-11-05)

| Mistake | Do instead |
|---------|------------|
| `cd repo && git pull` on Windows **PowerShell** | Use `;` as separator: `cd repo; git pull origin main` (or run commands separately). |

---

## Save data — highest priority (2026-11-04 incident)

| Mistake | Do instead |
|---------|------------|
| Booting **fresh state** after a load/migration error, then **auto-save overwriting** the real Tim slot | Follow [`save-integrity.md`](save-integrity.md): set `saveLoadFailed`, quarantine, **never write** primary until user recovers. No `createInitialState()` overwrite on failed load. |
| Assuming “reset” without checking **account slot** (Tim vs Chris), **online vs offline**, or **port/origin** | Diagnose keys `corp-civ-idle-save-v2-{tim\|chris}` and gate mode before blaming code. |
| Touching persistence without reading `saveIntegrity.ts` | Any save-shape or migration change: backups, regression guards, online + offline paths. |

---

## Branch / open-office design (2026-11-03–04)

| Mistake | Do instead |
|---------|------------|
| Hiding establish UI when blocked (e.g. cost only) | **Still show** pad/establish flow; blockers belong on cost/button, not disappearance. |
| Dev map: **creating** a branch for testing | Dev enables **hex + pads** so **players** run establish flow (`mapDevOpenOffices` in shared layout). |
| Office cap label `branches/maxBranches` only | Use **company office sites**: **1/1** before Branch Management research; **1/2** with Branch Management; **1/3** after Massive Expansion L1, etc. (`companyOfficeSiteFraction`). |
| Treating pads as single-player-only | Pads are **shared-world slots per hex**; multiple players; pad frees when branch closes; Massive Expansion caps **company** branch count, not pad count alone. |
| Asking whether players see **other players’ research** | Out of scope — players never see others’ research; don’t clutter Q&A. |
| Missing **BM travel time**, log, and UI while in transit | Establish sends BM from **selected office**; consumed **on arrival**; show transit like jobs/teams. |
| Map **Home** button renamed to current branch | Label stays **Home**; click **centers map on selected office** (HQ or any branch). |
| Establish confirm: huge empty layout, wrong palette, square grey overlay | Match **world map tab** tokens; compact type scale; overlay respects **same border-radius** as panel (full cover). |
| Establish copy too long / wrong order | Title **Establish New branch**; BM cost **below** cash line; “Consumed when branch opens” — drop redundant “not returned to HQ”. |
| `Send` to Secretary without scrolling | Navigate **and** scroll to team / crew picker so player doesn’t hunt. |

---

## Player UI habits (2026-11-04)

| Mistake | Do instead |
|---------|------------|
| Unit totals as **4.0** | Integer display for unit counts on Home/overview. |
| Job map filter axis labeled like single **tower** | Filter dimension **Type**: tower, major hub, commercial lot, gov't. |
| **Contracts** block when hex has none | Omit section entirely. |
| Commercial lot pad labels: **space** vs **cost** hard to read | Fix contrast/size in hex drawer (map tab CSS). |
| Violating [`player-view-ui.mdc`](../.cursor/rules/player-view-ui.mdc): redundant blockers, intro fluff | Cost line = affordability; button = state; queue first. |

---

## Code & process

| Mistake | Do instead |
|---------|------------|
| Editing **`researchData.ts` / balance** casually during feature work (e.g. accidental build-time tweak) | Balance lives in committed data files only when **intentionally** tuning; run `npm run build` after. |
| Wiring map coords / visibility to **per-player save** without asking | Canon geography + shared branches → shared layout/Firestore; player-only toggles in **private settings** — **ask Chris** if unsure ([`AGENTS.md`](../AGENTS.md) landmark policy). |
| Large UI reads without **`git status` / `git diff`** | Repo often has WIP on `main`. |
| **Commit / push** without Chris asking | User rule: commit only on explicit request. |
| **`docs-pages.yml`** without enabling **Settings → Pages → GitHub Actions** | `deploy-pages` fails every `docs/**` push; remove workflow if public review links aren’t needed. |
| Full-repo grep instead of handoff **read order** | `AGENTS.md` → `docs/ui-principles.md` → target view + `progressionUi.tsx` + relevant CSS. |

---

## Progression hub UI — freeze header (2026-11-05)

| Mistake | Do instead |
|---------|------------|
| **`position: sticky` + solid `--bg`** on progression chrome | **Split pane:** `ProgressionTabStickyChrome` in `.progression-tab-frozen-header` **above** `HubSyncedTabScrollBody`; class `hub-synced-tab-view--progression-freeze`; transparent + optional hairline only. |
| Gap under resource bar on progression views | Override view **`gap: 0`** (`.operations-view` etc. had `gap: 0.85rem` between flex children). |
| Blur / heavy shadow on freeze row | Chris rejected; use scroll clip (content scrolls under fixed row boundary), not overlay mask. |

---

## Online map looked brighter on one account (2026-11-07)

| Mistake | Do instead |
|---------|------------|
| Assuming Tim vs Chris see the same map because they share `worlds/dev` | **Brightness/busyness** can differ when one save has **Map filter → landmark art off** and/or **Z1 layer filters**, while the other uses defaults (full baked landmarks = “brighter”). |
| Letting **map layout dev fields** live in each player’s private save online | Canon geometry comes from Firestore `shared/mapLayout` only (`SHARED_WORLD_MAP_SETTING_KEYS`); online **load + sync** strip those keys from private blobs and apply shared layout (`mergeOnlineSettings` / `applySharedWorldLayoutToGameState`). |
| Carrying **per-account dimming** into online co-play | `sanitizeOnlinePrivateMapClientSettings`: drop `mapZ1LayerFilters`; clear `mapShowWorldLandmarkArt: false` so online uses default **landmarks on** for everyone. |

---

## How to update this file

After a session where Chris corrects the agent twice on the same theme, add a row under the right section with date. Keep rows **actionable** (mistake → fix), not narrative.
