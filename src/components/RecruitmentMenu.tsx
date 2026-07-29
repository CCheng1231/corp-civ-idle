import { type Dispatch } from "react";
import {
  CONTRACTOR_TYPES,
  OFFICE_LABELS,
  aggregateRoster,
  canAffordAtOffice,
  espionageDefensePercent,
  formatNumber,
  powerAvailable,
  recruitCost,
} from "../game/constants";

interface RecruitmentMenuProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  onClose: () => void;
}

export function RecruitmentMenu({
  state,
  dispatch,
  onClose,
}: RecruitmentMenuProps) {
  const officeId = state.selectedOffice;
  const loc = state.locationStats[officeId];
  const defensePct = espionageDefensePercent(
    aggregateRoster(state.contractorsByLocation).defense,
  );

  function hire(type: ContractorTypeId) {
    dispatch({ type: "RECRUIT_CONTRACTOR", contractorType: type });
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal recruitment-menu"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="recruitment-title"
      >
        <header className="modal-header">
          <div>
            <h2 id="recruitment-title">Recruitment</h2>
            <p className="muted">
              Hiring at {OFFICE_LABELS[officeId]} · No staff cap — pay costs
              only · Power free {formatNumber(powerAvailable(loc))}/
              {formatNumber(loc.power)} · Defense {defensePct}%
            </p>
          </div>
          <button type="button" className="tab" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="recruitment-grid">
          {CONTRACTOR_TYPES.map((type) => {
            const cost = recruitCost(state, type.id);
            const affordable = canAffordAtOffice(state, officeId, cost);
            const owned = state.contractorsByLocation[officeId][type.id];
            return (
              <article key={type.id} className="structure-card recruitment-card">
                <div className="structure-head">
                  <strong>{type.role}</strong>
                  <span>×{owned} here</span>
                </div>
                <p className="recruitment-flavor">{type.flavorTitle}</p>
                <p>{type.description}</p>
                <button
                  type="button"
                  className="btn primary"
                  disabled={!affordable}
                  onClick={() => hire(type.id)}
                >
                  Hire
                </button>
                <small className="cost-line">
                  {Object.entries(cost)
                    .map(([k, v]) =>
                      k === "electricity"
                        ? `power ${formatNumber(v ?? 0)}`
                        : `${k} ${formatNumber(v ?? 0)}`,
                    )
                    .join(" · ")}
                </small>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import type { ContractorTypeId, GameAction, GameState } from "../game/types";
