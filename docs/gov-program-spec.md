# Government Program — design spec (Nov 2026)

Player-facing hub: **Secretary → Govt Prog** (flyout: **Roster | Job | Govt Prog | Log**).

Balance and quest rows: **`Corp Idle Working.xlsx`** → `node scripts/build-gov-program-data.mjs` → `src/game/govProgramData.ts`.

Chief secretary magnitudes: **`Secretary Stat`** → `node scripts/build-secretary-data.mjs` → `src/game/secretaryData.ts` + `secretaryEffects.ts` reads pct from data.

---

## Save fields (private save only)

```ts
govProgram: {
  growthDeclined: boolean;           // declined Regional growth program
  growthStepId: string | null;       // current Growth step; null if declined or complete
  growthCompletedStepIds: string[];

  charterSkipped: boolean;           // Skip charter (Growth accepted path only)
  charterCompleted: boolean;
  engageLockActive: boolean;         // derived: full path && !charterCompleted && !charterSkipped

  executiveStepId: string | null;    // full path only; null if skip/decline
  executiveCompletedStepIds: string[];

  lifetimeRecruits: number;          // increment on recruit complete (all offices)
  gessesaUnlocked: boolean;          // roster + intro done

  dailyWeekMonth: {                  // timers TBD in implementation
    lastDailyClaimAt: number | null;
    // ...
  };
}
```

Migration: existing saves → all flags false/null; `lifetimeRecruits` from roster sum or 0.

---

## Three paths (after **10 lifetime recruits**)

| Path | Trigger | Growth track | Charter job | Engage lock | Lessons | Gessesa |
|------|---------|------------|-------------|-------------|---------|---------|
| **Full** | Accept Growth, no Skip | Yes, **paused** at 10 hires until charter done/skip | Yes, player-only | Yes until charter **or** Skip | Team lead → Lafe beat → **Chief switch required** | Intro modal → Roster |
| **Skip charter** | Accept Growth + **Skip charter** | Resumes | **No** | Off | **No** | Intro modal → Roster only |
| **Decline Growth** | Decline with warning | **No** | **No** | **No** | **No** (no Lafe Chief lesson) | Intro modal → Roster only |

**Decline / Skip:** no Growth track teaching; mechanics stay visible in the UI—players learn on their own. At 10 hires: **Gessesa + intro only** (no charter, no Chief lesson on decline).

**Skip charter:** no executive assignment chain—unlock Gessesa and stop (no Gov unique job).

**Team lead UI before Gessesa:** “No secretary available at the moment.”

**Chief (full path only):** required switch after Lafe beat; **whoever they pick stays**; may switch when secretary at HQ and not on task force.

**Priority (full path):** Growth **pauses** at 10 hires until charter complete or Skip.

---

## Full path — step order

| Step ID | Trigger | Player action | Notes |
|---------|---------|---------------|--------|
| `exec_unlock` | `lifetimeRecruits >= 10` | Open Govt Prog | Growth pauses |
| `exec_intro` | auto | Continue on modal | Gessesa portrait intro |
| `exec_roster` | intro done | View Roster (guided) | Row visible |
| `exec_charter_engage` | 10 **free** units | Engage charter on Govt Prog only | Lock all other engages |
| `exec_charter_return` | engage | Instant teleport out+back once | Banner: one-time program charter |
| `exec_team_lead_done` | return | — | Tease future travel bonus |
| `exec_lafe_beat` | return | Continue dialogue | Lafe wanted field lead |
| `exec_chief_switch` | lafe beat | Select Chief on Roster | Required; any choice sticks |
| `exec_complete` | chief switch | — | Growth resumes; lock off |

**Skip charter** anytime on Govt Prog card → set `charterSkipped`, unlock engages, set `gessesaUnlocked` + intro if not done, **skip** rows `exec_charter_*` through `exec_chief_switch`.

**Decline Growth** → at 10 hires only `gessesaUnlocked` + intro (no executive steps).

---

## Growth path — step order (when not declined)

See sheet **Gov Program Growth** for copy/rewards. Default order:

1. `growth_structure` — queue or complete one structure upgrade  
2. `growth_recruit_push` — start recruiting (toward 10)  
3. `growth_map` — open World, inspect a site  
4. *(pauses at 10 hires if full executive path active)*  
5. `growth_job` — engage a normal job (after charter or skip/decline)  
6. `growth_report` — job report  
7. `growth_research` — queue research  
8. `growth_bm_hint` — optional copy only: recruit Branch Manager when ready  
9. `growth_bm_hired` — BM on roster (optional completion)

BM branch is **optional**; no block on Gessesa.

---

## Engage lock

When `engageLockActive`: disable **Engage** / map **Send** for all postings except none (charter is on Govt Prog only, not Job board).

---

## Charter job

- Definition id: `gov_charter_introduction` (sheet **Gov Program Charter Job**).
- Posting: **private save only** (never Firestore shared board).
- Crew: min 10 units, all free; Gessesa team lead (flavor).
- One-time instant resolve on Engage (no travel/work timers).

---

## Calendar quests

Sheets **Daily**, **Weekly**, **Monthly**: pool of objectives; implementation picks one active row per period (logic TBD). Rewards and targets editable in Excel.

---

## Implementation order (when Chris says go)

1. Save schema + recruit counter + migration  
2. `build-gov-program-data.mjs` + committed `govProgramData.ts`  
3. Govt Prog tab + flyout nav  
4. Growth + Executive state machines  
5. Charter posting + teleport engage + lock  
6. Intro modal + Gessesa `inRoster` via unlock flag  
7. Dialogues (Lafe, Chief)  
8. Daily/weekly/monthly (minimal claim loop)

Team-lead **mechanic** (−5% travel): after quest wiring, before polish.

---

## Changelog

| Date | Note |
|------|------|
| 2026-11-05 | Initial spec from design session (Chris + agent) |
