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
import { TabPortraitLayout } from "./TabPortraitLayout";
import { TabSiteHeader } from "./TabSiteHeader";
import { tabQuote } from "../game/tabQuotes";
import researchPortrait from "../assets/Research.webp";
import { officeDisplayName, ownedOfficeIds } from "../game/mapWorld";
import {
  isAllOfficesSelected,
  resolveOfficeLocation,
} from "../game/officeSelection";
import { ProgressionDetailDialog } from "./ProgressionDetailDialog";
import { buildResearchDetailModel } from "./progressionDetailModel";
import {
  ProgressionCategorySection,
  ProgressionMaxedCard,
  ProgressionNameButton,
} from "./progressionUi";
import { ResearchQueueList } from "./StructureBuildQueueList";
import type {
  GameAction,
  GameState,
  OfficeLocationId,
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
  const showAll = isAllOfficesSelected(state.selectedOffice);
  const office: OfficeLocationId = resolveOfficeLocation(state);
  const actionsLocked = showAll;
  const researchQueue = researchJobsAtOffice(state, office);
  const queueFull = isResearchQueueFull(state, office);
  const projected = projectedResearchLevels(state);
  const now = Date.now();
  const [hideCompleted, setHideCompleted] = useState(false);
  const [detailResearch, setDetailResearch] = useState<ResearchDefinition | null>(
    null,
  );
  const portraitStorageKey = "corp-civ-idle-research-portrait-size";
  const researchCompletedCount = RESEARCH.filter((research) =>
    isResearchCompleted(state, research),
  ).length;
  const researchTotalCount = RESEARCH.length;

  function openResearchDetail(research: ResearchDefinition) {
    setDetailResearch(research);
  }

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
      actionsLocked ||
      !unlocked ||
      maxed ||
      inProgress ||
      !affordable ||
      queueBlocked;
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
            onNameClick={() => openResearchDetail(research)}
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
          <ProgressionNameButton
            name={research.name}
            onClick={() => openResearchDetail(research)}
          />
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
            : actionsLocked
              ? "Pick an office"
            : inProgress
              ? "In progress"
              : queueBlocked
                ? "Queue full"
                : "Queue research"}
        </button>
      </li>
    );
  }

  const researchBesidePortrait = (
    <>
      <TabSiteHeader title="R&D" state={state} dispatch={dispatch} />
      {showAll ? (
        ownedOfficeIds(state).map((siteId) => {
          const siteQueue = researchJobsAtOffice(state, siteId);
          return (
            <section
              key={siteId}
              className="location-view-section tab-queue-section tab-compact-queue"
            >
              <div className="tab-queue-heading">
                <h3>{officeDisplayName(state, siteId)}</h3>
                <span
                  className="tab-queue-count muted"
                  aria-label={`Research queue ${siteQueue.length} of ${MAX_RESEARCH_QUEUE}`}
                >
                  {siteQueue.length}/{MAX_RESEARCH_QUEUE}
                </span>
              </div>
              <ResearchQueueList
                state={state}
                jobs={siteQueue}
                officeId={siteId}
                dispatch={dispatch}
                now={now}
                compact
                emptyLabel="No research queued."
              />
            </section>
          );
        })
      ) : (
        <section className="location-view-section tab-queue-section tab-compact-queue">
          <div className="tab-queue-heading">
            <h3>Research in progress</h3>
            <div className="tab-queue-heading-actions">
              <span
                className="tab-queue-count muted"
                aria-label={`Research queue ${researchQueue.length} of ${MAX_RESEARCH_QUEUE}`}
              >
                {researchQueue.length}/{MAX_RESEARCH_QUEUE}
              </span>
              <label className="progression-hide-completed-check tab-queue-filter">
                <input
                  type="checkbox"
                  checked={hideCompleted}
                  onChange={(event) => setHideCompleted(event.target.checked)}
                />
                Hide completed
              </label>
            </div>
          </div>
          <ResearchQueueList
            state={state}
            jobs={researchQueue}
            officeId={office}
            dispatch={dispatch}
            now={now}
            compact
            emptyLabel="No research queued."
          />
        </section>
      )}
      <p
        className="research-progress-beside"
        aria-label={`${researchCompletedCount} of ${researchTotalCount} research completed`}
      >
        <span className="research-progress-beside-label">Firm-wide</span>
        <strong className="research-progress-beside-count">
          {researchCompletedCount}/{researchTotalCount}
        </strong>
        <span className="research-progress-beside-suffix">completed</span>
      </p>
    </>
  );

  const researchBelowPortrait = (
    <>
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
    </>
  );

  return (
    <div className="main-view-panel location-view-panel research-view">
      <div className="location-view-body">
        <TabPortraitLayout
          src={researchPortrait}
          storageKey={portraitStorageKey}
          quote={tabQuote(state, "research")}
          portraitLayout="stretch"
          parallaxScroll={false}
          portraitLocked={false}
          allowPortraitResize={false}
          className="tab-portrait-fit"
        >
          {researchBesidePortrait}
        </TabPortraitLayout>
        <div className="tab-below-portrait">{researchBelowPortrait}</div>
      </div>
      {detailResearch && (
        <ProgressionDetailDialog
          {...buildResearchDetailModel(state, detailResearch)}
          onClose={() => setDetailResearch(null)}
        />
      )}
    </div>
  );
}
