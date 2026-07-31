import { type Dispatch } from "react";
import {
  RESEARCH,
  canAffordAtOffice,
  isResearchUnlocked,
  researchRequirementLabel,
} from "../game/constants";
import { researchCost } from "../game/engine";
import { researchUpgradePreviewLines } from "../game/researchPreview";
import {
  formatPreviewDelta,
  formatPreviewText,
} from "./upgradePreviewFormat";
import { StructureCostLine } from "./StructureCostLine";
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
      <ul className="structure-list research-grid office-structure-grid">
        {RESEARCH.map((research) => {
          const level = state.researchLevels[research.id];
          const maxed = level >= research.maxLevel;
          const unlocked = isResearchUnlocked(state, research);
          const cost = researchCost(state, research.id);
          const affordable = canAffordAtOffice(state, office, cost);
          const disabled = !unlocked || maxed || !affordable;
          const targetLevel = level + 1;
          const previewLines =
            maxed || !unlocked
              ? []
              : researchUpgradePreviewLines(research, level, targetLevel);

          return (
            <li
              key={research.id}
              className={`structure-card structure-card-upgrade${unlocked ? "" : " progression-locked"}`}
            >
              <div className="structure-head">
                <strong>{research.name}</strong>
                <span>
                  {maxed ? (
                    <>Lv {level}/{research.maxLevel}</>
                  ) : (
                    <>Lv {level} → {targetLevel}</>
                  )}
                </span>
              </div>
              {!maxed && unlocked && (
                <div className="structure-upgrade-preview">
                  <StructureCostLine
                    state={state}
                    officeId={office}
                    cost={cost}
                    layout="stack"
                  />
                  {previewLines.length > 0 && (
                    <ul className="structure-upgrade-preview-stats">
                      {previewLines.map((line) => (
                        <li key={line.label}>
                          <span className="structure-upgrade-preview-label">
                            {line.label}
                          </span>
                          <span className="structure-upgrade-preview-value">
                            {line.text
                              ? formatPreviewText(line.text)
                              : formatPreviewDelta(
                                  line.from,
                                  line.to,
                                  line.unit,
                                  line.label,
                                )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
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
