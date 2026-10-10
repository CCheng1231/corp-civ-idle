# Balance playtest checklist (M0–M3)

Run after changing `structureBalanceData.ts`, `researchData.ts`, or `jobHubData.ts`.

1. Regenerate metrics: `node scripts/balance-report.mjs` → review [`balance-report.md`](balance-report.md).
2. **M0 — new save:** Note cash/hr from desk; time to afford desk L2 and first T1 shift supplies.
3. **T1 spike:** Complete one Tier 1 posting; payout should feel like several hours of passive (see report M0 column).
4. **M1 — desk L2–3 + units:** T1 still ≥2 h passive equivalent; first T2 completion ≈15–25 h passive at ~500 cash/hr.
5. **M2 — dept + R&D + one research:** Research level should not beat desk ROI without intentional build order; T2 ≈8–15 h at ~1200 cash/hr.
6. **UI:** Upgrade preview and job board $/unit-hour match report inputs.
