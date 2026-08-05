import { useState, type Dispatch } from "react";
import {
  RESEARCH,
  RESEARCH_CATEGORY_LABELS,
  RESEARCH_CATEGORY_ORDER,
  canAffordAtOffice,
  isResearchQueueFull,
  isResearchQueued,
  isResearchUnlocked,
  MAX_RESEARCH_QUEUE,
  projectedResearchLevels,
  researchDisplayDescription,
  researchJobsAtOffice,
  researchRequirementLabel,
} from "../game/constants";
import { researchCost } from "../game/engine";
import { researchBuildTimeHours } from "../game/researchBalance";
import {
  researchCompletedResultLines,
  researchUpgradePreviewLines,
} from "../game/researchPreview";
import { formatQueueTimeHours } from "../game/timers";
import {
  formatPreviewDelta,
  formatPreviewText,
  formatCompactBonus,
} from "./upgradePreviewFormat";
import { StructureCostLine } from "./StructureCostLine";
import { LocationViewHeader } from "./LocationViewHeader";
import {
  ProgressionCategorySection,
  ProgressionMaxedCard,
} from "./progressionUi";
import { ResearchQueueList, QueueSection } from "./StructureBuildQueueList";
import type {
  GameAction,
  GameState,
  ResearchDefinition,
} from "../game/types";

interface ResearchViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

function isResearchCompleted(
  state: GameState,
  research: ResearchDefinition,
): boolean {
  return state.researchLevels[research.id] >= research.maxLevel;
}

export function ResearchView({ state, dispatch }: ResearchViewProps) {
  const office = state.selectedOffice;
  const researchQueue = researchJobsAtOffice(state, office);
  const queueFull = isResearchQueueFull(state, office);
  const projected = projectedResearchLevels(state);
  const now = Date.now();
  const [hideCompleted, setHideCompleted] = useState(false);

  function renderResearchCard(research: ResearchDefinition) {
    const level = state.researchLevels[research.id];
    const projectedLevel = projected[research.id];
    const maxed = isResearchCompleted(state, research);
    const inProgress = isResearchQueued(state, research.id) && !maxed;
    const unlocked = isResearchUnlocked(state, research);
    const cost = researchCost(state, research.id);
    const affordable = canAffordAtOffice(state, office, cost);
    const queueBlocked = queueFull && !inProgress;
    const disabled =
      !unlocked || maxed || inProgress || !affordable || queueBlocked;
    const targetLevel = inProgress
      ? projectedLevel
      : Math.min(level + 1, research.maxLevel);
    const buildHours = researchBuildTimeHours(research.id, targetLevel);
    const previewLines =
      maxed || inProgress || !unlocked
        ? []
        : researchUpgradePreviewLines(research, level, targetLevel).filter(
            (line) => line.label !== "Build time",
          );
    const completedLines = maxed
      ? researchCompletedResultLines(research, level)
      : [];
    const description = researchDisplayDescription(research);
    const compactBonus = formatCompactBonus(completedLines);
    const levelLabel =
      research.maxLevel > 1 ? `Lv ${level}/${research.maxLevel}` : `Lv ${level}`;

    if (maxed) {
      return (
        <li
          key={research.id}
          className="structure-card structure-card-upgrade research-card-completed progression-card-maxed"
        >
          <ProgressionMaxedCard
            name={research.name}
            levelLabel={levelLabel}
            compactBonus={compactBonus}
          >
            {completedLines.length > 0 ? (
              <ul className="structure-upgrade-preview-effects">
                {completedLines.map((line) => (
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
            <p className="structure-desc muted">{description}</p>
          </ProgressionMaxedCard>
        </li>
      );
    }

    return (
      <li
        key={research.id}
        className={`structure-card structure-card-upgrade${unlocked ? "" : " progression-locked"}`}
      >
        <div className="structure-head">
          <strong>{research.name}</strong>
          <span className="research-level-line">
            Lv {level} → {targetLevel}
            {research.maxLevel > 1 ? (
              <span className="research-level-max"> · max {research.maxLevel}</span>
            ) : null}
          </span>
        </div>
        {!inProgress && unlocked && (
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
        <p className="structure-desc muted">{description}</p>
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
              officeId: office,
            })
          }
        >
          {!unlocked
            ? "Locked"
            : inProgress
              ? "In progress"
              : queueBlocked
                ? "Queue full"
                : "Queue research"}
        </button>
      </li>
    );
  }

  return (
    <div className="main-view-panel location-view-panel">
      <LocationViewHeader
        title="Research"
        description="Firm-wide tech tree at the selected office."
        state={state}
        dispatch={dispatch}
      />
      <div className="location-view-body">
        <QueueSection
          label="Research queue"
          count={researchQueue.length}
          max={MAX_RESEARCH_QUEUE}
          className="location-queue-section research-queue-section"
          headerExtra={
            <label className="progression-hide-completed-check">
              <input
                type="checkbox"
                checked={hideCompleted}
                onChange={(event) => setHideCompleted(event.target.checked)}
              />
              Hide completed
            </label>
          }
        >
          <ResearchQueueList
            state={state}
            jobs={researchQueue}
            officeId={office}
            dispatch={dispatch}
            now={now}
          />
        </QueueSection>
        {RESEARCH_CATEGORY_ORDER.map((category) => {
          const items = RESEARCH.filter(
            (research) => research.category === category,
          ).filter(
            (research) =>
              !hideCompleted || !isResearchCompleted(state, research),
          );
          if (items.length === 0) return null;

          const maxedCount = items.filter((research) =>
            isResearchCompleted(state, research),
          ).length;
          const defaultOpen = items.some(
            (research) =>
              !isResearchCompleted(state, research) ||
              isResearchQueued(state, research.id),
          );

          return (
            <ProgressionCategorySection
              key={category}
              title={RESEARCH_CATEGORY_LABELS[category]}
              defaultOpen={defaultOpen}
              maxedCount={maxedCount}
              totalCount={items.length}
            >
              <ul className="structure-list progression-grid">
                {items.map(renderResearchCard)}
              </ul>
            </ProgressionCategorySection>
          );
        })}
      </div>
    </div>
  );
}
