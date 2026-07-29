import { type Dispatch } from "react";
import {
  RESEARCH,
  canAffordAtOffice,
  formatNumber,
  isResearchUnlocked,
  researchRequirementLabel,
} from "../game/constants";
import { researchCost } from "../game/engine";
import type { GameAction, GameState } from "../game/types";

interface ResearchViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function ResearchView({ state, dispatch }: ResearchViewProps) {
  const office = state.selectedOffice;

  return (
    <div className="main-view-panel">
      <header className="main-view-header">
        <h2>Research</h2>
        <p className="muted">
          Firm-wide tech tree — unlock nodes to speed jobs and boost payouts.
          Power costs on research use the selected office (
          {office.toUpperCase()}).
        </p>
      </header>
      <ul className="structure-list research-grid">
        {RESEARCH.map((research) => {
          const level = state.researchLevels[research.id];
          const maxed = level >= research.maxLevel;
          const unlocked = isResearchUnlocked(state, research);
          const cost = researchCost(state, research.id);
          const affordable = canAffordAtOffice(state, office, cost);
          const disabled = !unlocked || maxed || !affordable;
          return (
            <li
              key={research.id}
              className={`structure-card${unlocked ? "" : " progression-locked"}`}
            >
              <div className="structure-head">
                <strong>{research.name}</strong>
                <span>
                  Lv {level}/{research.maxLevel}
                </span>
              </div>
              {!maxed && unlocked && (
                <p className="structure-cost-primary">
                  {Object.entries(cost)
                    .map(([k, v]) =>
                      k === "electricity"
                        ? `power ${formatNumber(v ?? 0)}`
                        : `${k} ${formatNumber(v ?? 0)}`,
                    )
                    .join(" · ")}
                </p>
              )}
              <p className="structure-desc muted">{research.description}</p>
              {!unlocked && (
                <small className="cost-line">
                  Requires: {researchRequirementLabel(research)}
                </small>
              )}
              <button
                type="button"
                className="btn"
                disabled={disabled}
                onClick={() =>
                  dispatch({
                    type: "BUY_RESEARCH",
                    researchId: research.id,
                  })
                }
              >
                {!unlocked ? "Locked" : maxed ? "Maxed" : "Research"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
