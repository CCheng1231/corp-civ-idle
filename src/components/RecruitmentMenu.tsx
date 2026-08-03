import { type Dispatch } from "react";
import {
  OFFICE_LABELS,
  canAffordAtOffice,
  espionageDefensePercent,
  formatNumber,
  formatResourceCost,
  powerAvailable,
  recruitBatchCost,
} from "../game/constants";
import { RECRUITMENT_UNITS } from "../game/recruitmentData";
import type { GameAction, GameState, UnitId } from "../game/types";

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
  const defensePct = espionageDefensePercent(state);

  function hire(unitId: UnitId) {
    dispatch({ type: "RECRUIT_CONTRACTOR", unitId });
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
              Hiring at {OFFICE_LABELS[officeId]} · All tiers available · Power
              free {formatNumber(powerAvailable(loc))}/{formatNumber(loc.power)}{" "}
              · Defense {defensePct}%
            </p>
          </div>
          <button type="button" className="tab" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="recruitment-grid">
          {RECRUITMENT_UNITS.map((unit) => {
            const cost = recruitBatchCost(unit.id, 1);
            const affordable = canAffordAtOffice(state, officeId, cost);
            const owned = state.contractorsByLocation[officeId][unit.id] ?? 0;
            return (
              <article key={unit.id} className="structure-card recruitment-card">
                <div className="structure-head">
                  <strong>{unit.name}</strong>
                  <span>
                    T{unit.tier} · ×{owned} here
                  </span>
                </div>
                <p className="recruitment-flavor">{unit.category}</p>
                <p>{unit.proposedRole}</p>
                <button
                  type="button"
                  className="btn primary"
                  disabled={!affordable}
                  onClick={() => hire(unit.id)}
                >
                  Hire
                </button>
                <small className="cost-line">{formatResourceCost(cost)}</small>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
