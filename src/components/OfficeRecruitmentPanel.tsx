import { useState, type Dispatch } from "react";
import {
  CONTRACTOR_TYPES,
  MAX_RECRUIT_BATCH,
  RECRUIT_MS_PER_CONTRACTOR,
  canAffordAtOffice,
  formatNumber,
  powerAvailable,
  recruitBatchCost,
  recruitmentJobsAtOffice,
  splitResourceCost,
} from "../game/constants";
import { formatTimerRemaining } from "../game/timers";
import type {
  ContractorTypeId,
  GameAction,
  GameState,
  OfficeLocationId,
} from "../game/types";

interface OfficeRecruitmentPanelProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  officeId: OfficeLocationId;
}

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
  const [counts, setCounts] = useState<Record<ContractorTypeId, number>>({
    farming: 1,
    defense: 1,
    intel: 1,
    support: 1,
  });

  const queue = recruitmentJobsAtOffice(state, officeId).sort(
    (a, b) => a.completesAt - b.completesAt,
  );

  function hire(type: ContractorTypeId) {
    const count = Math.max(1, Math.min(MAX_RECRUIT_BATCH, counts[type] ?? 1));
    dispatch({
      type: "START_RECRUITMENT",
      officeId,
      contractorType: type,
      count,
    });
  }

  return (
    <div className="office-recruitment-panel">
      <p className="muted office-recruitment-intro">
        Pay upfront, then one contractor arrives every{" "}
        {RECRUIT_MS_PER_CONTRACTOR / 1000}s (queued per site). Power free{" "}
        {formatNumber(powerAvailable(loc))}/{formatNumber(loc.power)}.
      </p>
      {queue.length > 0 && (
        <div className="office-recruitment-queue">
          <h4>Hiring queue</h4>
          <ul className="build-queue">
            {queue.map((job) => {
              const typeDef = CONTRACTOR_TYPES.find(
                (t) => t.id === job.contractorType,
              );
              const remaining = formatTimerRemaining(
                state,
                job.completesAt,
                now,
              );
              return (
                <li key={job.id}>
                  <span className="queue-name">
                    {typeDef?.role ?? job.contractorType}
                  </span>
                  <span className="queue-status">{remaining}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <ul className="structure-list research-grid">
        {CONTRACTOR_TYPES.map((type) => {
          const count = counts[type.id] ?? 1;
          const cost = recruitBatchCost(state, type.id, count);
          const affordable = canAffordAtOffice(state, officeId, cost);
          const owned = state.contractorsByLocation[officeId][type.id];
          const { power } = splitResourceCost(cost);
          const blocked =
            power > powerAvailable(loc)
              ? `Need ${power} power (${formatNumber(powerAvailable(loc))} free)`
              : null;

          return (
            <li key={type.id} className="structure-card">
              <div className="structure-head">
                <strong>{type.role}</strong>
                <span>×{owned} here</span>
              </div>
              <p className="recruitment-flavor">{type.flavorTitle}</p>
              <p className="structure-desc muted">{type.description}</p>
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
                    setCounts((prev) => ({ ...prev, [type.id]: n }));
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
                onClick={() => hire(type.id)}
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
