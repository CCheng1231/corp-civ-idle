# Secretary progression

## Roster

- **Surtr** — start unlocked (`secretary_01`).
- **Xaihi** — Government Program (10 lifetime recruits); synced via `govProgram.xaihiUnlocked`.
- **Skadi, Fang Yi, Tang Tang** — milestone recruitment (random among remaining locked candidates).

## Roles

- One **Chief of Staff** (`chiefOfStaffId`) — company-wide chief tree bonuses + identity perk.
- **Team lead** per active `JobEngagement` (`teamLeadSecretaryId`) — unique identity perk per secretary (travel, work time, job income, travel supply, or unit-hours throughput) plus the shared team skill tree.

## Leveling & skills

- Max level **10**; **2 skill points** per level gained.
- **Chief tree:** cash/supply throughput, structure build speed, research speed.
- **Team lead tree:** travel, on-site work speed, job payout.
- Identity perks from the Secretary Stat sheet stack with allocated ranks (hybrid).

### EXP sources

| Event | Recipient |
|-------|-----------|
| Structure complete | Chief |
| Research complete | Chief |
| Branch opened | Chief |
| Job shift complete | Team lead on that engagement (scales with crew size) |

## Recruitment milestones

| ID | Trigger |
|----|---------|
| `recruit_first_branch` | First branch site established |
| `recruit_net_worth_250k` | Net worth ≥ 250,000 |
| `recruit_secretary_mastery` | Any unlocked secretary at level 10 with all skill nodes at rank 3 |

Offers use a random pick from `secretary_03`–`secretary_05` still locked. See also [gov-program-spec.md](./gov-program-spec.md) for Xaihi.

## Code map

- State: `types.ts` (`secretaryUnlocks`, `secretaryProgress`, `secretaryRecruitment`)
- Skills: `secretarySkillData.ts`, `secretaryEffects.ts`
- EXP: `secretaryExp.ts`
- Gacha: `secretaryRecruitment.ts`, `SecretaryRecruitmentModal.tsx`
