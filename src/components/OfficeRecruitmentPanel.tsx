import { useState, type Dispatch } from "react";
import {
  MAX_RECRUIT_BATCH,
  RECRUIT_MS_PER_CONTRACTOR,
  canAffordAtOffice,
  formatNumber,
  powerAvailable,
  recruitBatchCost,
  recruitmentJobsAtOffice,
  splitResourceCost,
  unitAvailableAt,
} from "../game/constants";
import { formatTimerRemaining } from "../game/timers";
import { RECRUITMENT_UNITS } from "../game/recruitmentData";
import { unitDefinition } from "../game/unitEffects";
import type { GameAction, GameState, OfficeLocationId, UnitId } from "../game/types";

interface OfficeRecruitmentPanelProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  officeId: OfficeLocationId;
}

const CATEGORY_LABELS: Record<string, string> = {
  farming: "Resource Farming",
  defense: "Protection / Defense",
  intel: "Intel / Scouting",
  support: "Support Units",
};

function formatCost(cost: ReturnType<typeof recruitBatchCost>) {
  return Object.entries(cost)
    .map(([k, v]) =>
      k === "electricity"
        ? `power ${formatNumber(v ?? 0)}`
        : `${k} ${formatNumber(v ?? 0)}`,
    )
    .join(" · ");
}

export function OfficeRecruitmentPanel({
  state,
  dispatch,
  officeId,
}: OfficeRecruitmentPanelProps) {
  const now = Date.now();
  const loc = state.locationStats[officeId];
  const [counts, setCounts] = useState<Partial<Record<UnitId, number>>>({});

  const queue = recruitmentJobsAtOffice(state, officeId).sort(
    (a, b) => a.completesAt - b.completesAt,
  );

  function hire(unitId: UnitId) {
    const count = Math.max(
      1,
      Math.min(MAX_RECRUIT_BATCH, counts[unitId] ?? 1),
    );
    dispatch({
      type: "START_RECRUITMENT",
      officeId,
      unitId,
      count,
    });
  }

  return (
    <div className="office-recruitment-panel">
      <p className="muted office-recruitment-intro">
        All tier 1 and tier 2 units are available. Pay upfront, then one unit
        arrives every {RECRUIT_MS_PER_CONTRACTOR / 1000}s (queued per site).
        Power free {formatNumber(powerAvailable(loc))}/{formatNumber(loc.power)}.
      </p>
      {queue.length > 0 && (
        <div className="office-recruitment-queue">
          <h4>Hiring queue</h4>
          <ul className="build-queue">
            {queue.map((job) => {
              const unit = unitDefinition(job.unitId);
              const remaining = formatTimerRemaining(
                state,
                job.completesAt,
                now,
              );
              return (
                <li key={job.id}>
                  <span className="queue-name">{unit.name}</span>
                  <span className="queue-status">{remaining}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <ul className="structure-list research-grid">
        {RECRUITMENT_UNITS.map((unit) => {
          const count = counts[unit.id] ?? 1;
          const cost = recruitBatchCost(unit.id, count);
          const affordable = canAffordAtOffice(state, officeId, cost);
          const owned = unitAvailableAt(state, officeId, unit.id);
          const { power } = splitResourceCost(cost);
          const blocked =
            power > powerAvailable(loc)
              ? `Need ${power} power (${formatNumber(powerAvailable(loc))} free)`
              : null;

          return (
            <li key={unit.id} className="structure-card">
              <div className="structure-head">
                <strong>{unit.name}</strong>
                <span>
                  T{unit.tier} · ×{owned} here
                </span>
              </div>
              <p className="recruitment-flavor">{CATEGORY_LABELS[unit.category]}</p>
              <p className="structure-desc muted">{unit.proposedRole}</p>
              <label className="recruit-count-field">
                Hire count
                <input
                  type="number"
                  min={1}
                  max={MAX_RECRUIT_BATCH}
                  value={count}
                  onChange={(e) => {
                    const n = Math.max(
                      1,
                      Math.min(
                        MAX_RECRUIT_BATCH,
                        Number(e.target.value) || 1,
                      ),
                    );
                    setCounts((prev) => ({ ...prev, [unit.id]: n }));
                  }}
                />
              </label>
              <p className="structure-cost-primary">{formatCost(cost)}</p>
              {blocked && !affordable && (
                <p className="structure-blocker">{blocked}</p>
              )}
              <button
                type="button"
                className="btn primary"
                disabled={!affordable}
                onClick={() => hire(unit.id)}
              >
                Start hiring ({count})
              </button>
              <small className="cost-line">
                ~{(count * RECRUIT_MS_PER_CONTRACTOR) / 1000}s total
              </small>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
