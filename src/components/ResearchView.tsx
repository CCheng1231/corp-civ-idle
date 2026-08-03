import { type Dispatch } from "react";
import {
  RESEARCH,
  canAffordAtOffice,
  isResearchQueueFull,
  isResearchUnlocked,
  MAX_RESEARCH_QUEUE,
  projectedResearchLevels,
  researchJobsAtOffice,
  researchRequirementLabel,
} from "../game/constants";
import { researchCost } from "../game/engine";
import { researchBuildTimeHours } from "../game/researchBalance";
import { researchUpgradePreviewLines } from "../game/researchPreview";
import { formatQueueTimeHours } from "../game/timers";
import {
  formatPreviewDelta,
  formatPreviewText,
} from "./upgradePreviewFormat";
import { StructureCostLine } from "./StructureCostLine";
import { LocationViewHeader } from "./LocationViewHeader";
import { ResearchQueueList, QueueSection } from "./StructureBuildQueueList";
import type { GameAction, GameState } from "../game/types";

interface ResearchViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function ResearchView({ state, dispatch }: ResearchViewProps) {
  const office = state.selectedOffice;
  const researchQueue = researchJobsAtOffice(state, office);
  const queueFull = isResearchQueueFull(state, office);
  const projected = projectedResearchLevels(state);
  const now = Date.now();

  return (
    <div className="main-view-panel location-view-panel">
      <LocationViewHeader
        title="Research"
        description={
          <>
            Firm-wide tech tree — unlock nodes to speed jobs and boost payouts.
            Research queues at the selected office, max {MAX_RESEARCH_QUEUE}{" "}
            queued. Power costs use that office.
          </>
        }
        state={state}
        dispatch={dispatch}
      />
      <div className="location-view-body">
      <QueueSection
        label="Research queue"
        count={researchQueue.length}
        max={MAX_RESEARCH_QUEUE}
        className="location-queue-section research-queue-section"
      >
        <ResearchQueueList
          state={state}
          jobs={researchQueue}
          officeId={office}
          dispatch={dispatch}
          now={now}
        />
      </QueueSection>
      <ul className="structure-list research-grid office-structure-grid">
        {RESEARCH.map((research) => {
          const level = state.researchLevels[research.id];
          const projectedLevel = projected[research.id];
          const maxed = projectedLevel >= research.maxLevel;
          const unlocked = isResearchUnlocked(state, research);
          const cost = researchCost(state, research.id);
          const affordable = canAffordAtOffice(state, office, cost);
          const queueBlocked = queueFull;
          const disabled = !unlocked || maxed || !affordable || queueBlocked;
          const targetLevel = projectedLevel + 1;
          const buildHours = researchBuildTimeHours(research.id, targetLevel);
          const previewLines =
            maxed || !unlocked
              ? []
              : researchUpgradePreviewLines(research, level, targetLevel).filter(
                  (line) => line.label !== "Build time",
                );

          return (
            <li
              key={research.id}
              className={`structure-card structure-card-upgrade${unlocked ? "" : " progression-locked"}`}
            >
              <div className="structure-head">
                <strong>{research.name}</strong>
                <span className="research-level-line">
                  {maxed ? (
                    <>Lv {level}</>
                  ) : (
                    <>Lv {projectedLevel} → {targetLevel}</>
                  )}
                  <span className="research-level-max">
                    Max level: {research.maxLevel}
                  </span>
                </span>
              </div>
              {!maxed && unlocked && (
                <div className="structure-upgrade-preview">
                  {previewLines.length > 0 ? (
                    <ul className="structure-upgrade-preview-effects">
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
                  ) : null}
                  <div className="structure-upgrade-preview-foot">
                    <StructureCostLine
                      state={state}
                      officeId={office}
                      cost={cost}
                      layout="stack"
                      heading="Cost"
                    />
                    {buildHours > 0 ? (
                      <div className="structure-upgrade-time">
                        <span className="structure-upgrade-preview-label">
                          Time
                        </span>
                        <span className="structure-upgrade-preview-value">
                          {formatQueueTimeHours(buildHours)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
              <p className="structure-desc muted">{research.description}</p>
              {!unlocked && (
                <small className="cost-line">
                  Requires: {researchRequirementLabel(research)}
                </small>
              )}
              {queueBlocked && unlocked && !maxed && (
                <small className="cost-line">Research queue full at this office</small>
              )}
              <button
                type="button"
                className="btn"
                disabled={disabled}
                onClick={() =>
                  dispatch({
                    type: "BUY_RESEARCH",
                    researchId: research.id,
                    officeId: office,
                  })
                }
              >
                {!unlocked ? "Locked" : maxed ? "Maxed" : queueBlocked ? "Queue full" : "Queue research"}
              </button>
            </li>
          );
        })}
      </ul>
      </div>
    </div>
  );
}
