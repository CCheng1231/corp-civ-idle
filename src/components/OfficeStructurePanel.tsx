import { useEffect, useState, type Dispatch, type ReactNode } from "react";
import {
  sortStructuresForBuildTab,
  structurePanelStructures,
  STRUCTURE_CATEGORY_LABELS,
  STRUCTURE_CATEGORY_ORDER,
  MAX_STRUCTURE_QUEUE,
  OFFICE_EXPANSION_STRUCTURE_ID,
  canBuildStructure,
  canSellStructureLevel,
  formatNumber,
  getStructureDefinition,
  isStructureCompletedAtSite,
  isStructureQueueFull,
  isStructureQueuedAt,
  isStructureUnlocked,
  projectedStructureLevels,
  powerAvailable,
  RESOURCE_LABELS,
  splitResourceCost,
  structureUnlockRequirementLabel,
} from "../game/constants";
import {
  structureCompletedResultLines,
  structureUpgradePreviewLines,
  structureBuildTimeMs,
} from "../game/structureBalance";
import {
  structureCost,
  structureDemolishRefund,
} from "../game/engine";
import { formatQueueTimeHours } from "../game/timers";
import { ConfirmDialog } from "./ConfirmDialog";
import { ProgressionCatalogToolbar } from "./ProgressionCatalogToolbar";
import { ProgressionDetailDialog } from "./ProgressionDetailDialog";
import { buildStructureDetailModel } from "./progressionDetailModel";
import {
  ProgressionCategorySection,
  ProgressionMaxedCard,
  ProgressionNameButton,
} from "./progressionUi";
import { SceneBanner } from "./SceneBanner";
import { StructureCardPortrait } from "./StructureCardPortrait";
import { CompactQueueHeading } from "./CompactQueueHeading";
import { StructureBuildQueueList, QueueSection } from "./StructureBuildQueueList";
import { StructureCostLine } from "./StructureCostLine";
import { ProgressionCardPortraitColumn } from "./ProgressionCardPortraitColumn";
import { ProgressionLockRequirements } from "./ProgressionLockRequirements";
import {
  getOfficeCategoryOpen,
  setOfficeCategoryOpen,
} from "../game/officeCategoryOpen";
import { structureProgressionLockNav } from "../game/progressionLockNav";
import { scrollProgressionCardIntoViewWhenReady } from "../utils/progressionFocusScroll";
import {
  formatPreviewDelta,
  formatPreviewText,
  formatCompactBonus,
} from "./upgradePreviewFormat";
import type {
  GameAction,
  GameState,
  OfficeLocationId,
  ResourceCost,
  StructureDefinition,
  StructureId,
  StructureCategory,
} from "../game/types";
import {
  ESSENTIALS_CATEGORY_BANNER,
  structureEssentialsPortrait,
} from "../game/structureEssentialsArt";
import {
  DEPARTMENTS_CATEGORY_BANNER,
  structureDepartmentsPortrait,
} from "../game/structureDepartmentsArt";
import {
  POWER_RESEARCH_CATEGORY_BANNER,
  structurePowerResearchPortrait,
} from "../game/structurePowerResearchArt";
import {
  RECRUITMENT_CATEGORY_BANNER,
  structureRecruitmentPortrait,
} from "../game/structureRecruitmentArt";

type OfficeCategoryScene = {
  src: string;
  storageKey?: string;
  panZoomFactor?: number;
  focalYPercent?: number;
  focalXPercent?: number;
  pannable: boolean;
};

const OFFICE_CATEGORY_SCENE: Record<StructureCategory, OfficeCategoryScene> = {
  essentials: {
    src: ESSENTIALS_CATEGORY_BANNER.src,
    storageKey: ESSENTIALS_CATEGORY_BANNER.storageKey,
    panZoomFactor: ESSENTIALS_CATEGORY_BANNER.crop.panZoomFactor,
    focalYPercent: ESSENTIALS_CATEGORY_BANNER.crop.focalYPercent,
    focalXPercent: ESSENTIALS_CATEGORY_BANNER.crop.focalXPercent,
    pannable: true,
  },
  departments: {
    src: DEPARTMENTS_CATEGORY_BANNER.src,
    storageKey: DEPARTMENTS_CATEGORY_BANNER.storageKey,
    panZoomFactor: DEPARTMENTS_CATEGORY_BANNER.crop.panZoomFactor,
    focalYPercent: DEPARTMENTS_CATEGORY_BANNER.crop.focalYPercent,
    focalXPercent: DEPARTMENTS_CATEGORY_BANNER.crop.focalXPercent,
    pannable: true,
  },
  infrastructure: {
    src: POWER_RESEARCH_CATEGORY_BANNER.src,
    storageKey: POWER_RESEARCH_CATEGORY_BANNER.storageKey,
    panZoomFactor: POWER_RESEARCH_CATEGORY_BANNER.crop.panZoomFactor,
    focalYPercent: POWER_RESEARCH_CATEGORY_BANNER.crop.focalYPercent,
    focalXPercent: POWER_RESEARCH_CATEGORY_BANNER.crop.focalXPercent,
    pannable: true,
  },
  staffing: {
    src: RECRUITMENT_CATEGORY_BANNER.src,
    storageKey: RECRUITMENT_CATEGORY_BANNER.storageKey,
    panZoomFactor: RECRUITMENT_CATEGORY_BANNER.crop.panZoomFactor,
    focalYPercent: RECRUITMENT_CATEGORY_BANNER.crop.focalYPercent,
    focalXPercent: RECRUITMENT_CATEGORY_BANNER.crop.focalXPercent,
    pannable: true,
  },
};

export function structureUpgradeBlocker(
  state: GameState,
  officeId: OfficeLocationId,
  structure: StructureDefinition,
  queueFull: boolean,
): string | null {
  const built = state.structureLevelsByLocation[officeId][structure.id];
  if (built >= structure.maxLevel) return null;

  if (queueFull) return "Build queue full (2/2) at this site";

  if (!isStructureUnlocked(state, structure.id)) {
    const req = structureUnlockRequirementLabel(structure.id);
    return req ? `Requires research: ${req}` : "Locked";
  }

  if (!canBuildStructure(state, officeId, structure.id)) {
    return "Not enough office space at this site";
  }

  if (state.settings.ignoreCosts) return null;

  const cost = structureCost(state, officeId, structure.id);
  const { global, power } = splitResourceCost(cost);
  for (const [key, amount] of Object.entries(global)) {
    const k = key as keyof GameState["resources"];
    const need = amount ?? 0;
    const label = RESOURCE_LABELS[k] ?? key;
    if (state.resources[k] < need) {
      return `Need ${formatNumber(need)} ${label} (have ${formatNumber(state.resources[k])})`;
    }
  }

  const freePower = powerAvailable(state.locationStats[officeId]);
  if (power > freePower) {
    return `Need ${power} Power at this site (${formatNumber(freePower)} free)`;
  }

  return null;
}

/** Blocker text for cards — omits power (already shown on the cost line). */
export function structureUpgradeBlockerDisplay(
  blocker: string | null,
): string | null {
  if (!blocker) return null;
  if (/Build queue full/i.test(blocker)) return null;
  if (/Power at this site/i.test(blocker)) return null;
  if (/Need \d/.test(blocker) && /\(have /i.test(blocker)) return null;
  return blocker;
}

export function structureUpgradeButtonLabel(params: {
  unlocked: boolean;
  readOnly: boolean;
  maxed: boolean;
  inProgress: boolean;
  queueFull: boolean;
}): string {
  const { unlocked, readOnly, maxed, inProgress, queueFull } = params;
  if (!unlocked) return "Locked";
  if (readOnly) return "Pick an office";
  if (maxed) return "Max";
  if (inProgress) return "In progress";
  if (queueFull) return "Queue max";
  return "Upgrade";
}

interface OfficeStructurePanelProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  officeId: OfficeLocationId;
  /** Site capacity / expansion — shown after build queue (Hire tab pattern). */
  siteSummary?: ReactNode;
  showBuildQueue?: boolean;
  hideCompleted: boolean;
  onHideCompletedChange: (value: boolean) => void;
  readOnly?: boolean;
}

interface OfficeBuildQueueSectionProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  officeId: OfficeLocationId;
  compact?: boolean;
}

export function OfficeBuildQueueSection({
  state,
  dispatch,
  officeId,
  compact = false,
}: OfficeBuildQueueSectionProps) {
  const buildQueue = state.structureQueues[officeId];
  const now = Date.now();

  if (compact) {
    return (
      <section className="location-view-section tab-queue-section tab-compact-queue">
        <CompactQueueHeading
          title="Structure in progress"
          count={`${buildQueue.length}/${MAX_STRUCTURE_QUEUE}`}
          countAriaLabel={`Structure queue ${buildQueue.length} of ${MAX_STRUCTURE_QUEUE}`}
        />
        <StructureBuildQueueList
          state={state}
          jobs={buildQueue}
          locationId={officeId}
          dispatch={dispatch}
          now={now}
          compact
          emptyLabel=""
        />
      </section>
    );
  }

  return (
    <QueueSection
      label="Build queue"
      count={buildQueue.length}
      max={MAX_STRUCTURE_QUEUE}
      className="location-queue-section office-build-queue-section"
    >
      <StructureBuildQueueList
        state={state}
        jobs={buildQueue}
        locationId={officeId}
        dispatch={dispatch}
        now={now}
      />
    </QueueSection>
  );
}

export function OfficeStructurePanel({
  state,
  dispatch,
  officeId,
  siteSummary,
  showBuildQueue = true,
  hideCompleted,
  onHideCompletedChange,
  readOnly = false,
}: OfficeStructurePanelProps) {
  const locationStructures = state.structureLevelsByLocation[officeId];
  const projectedStructures = projectedStructureLevels(state, officeId);
  const queueFull = isStructureQueueFull(state, officeId);
  const [sellConfirm, setSellConfirm] = useState<{
    structureId: StructureId;
    structureName: string;
    refund: ResourceCost;
  } | null>(null);
  const [detailStructure, setDetailStructure] =
    useState<StructureDefinition | null>(null);
  const [categoryOpen, setCategoryOpen] = useState<
    Partial<Record<StructureCategory, boolean>>
  >(() => {
    const seeded: Partial<Record<StructureCategory, boolean>> = {};
    for (const category of STRUCTURE_CATEGORY_ORDER) {
      const remembered = getOfficeCategoryOpen(officeId, category);
      if (remembered !== undefined) seeded[category] = remembered;
    }
    return seeded;
  });
  const focusStructureId = state.structureFocusStructureId ?? null;
  const focusStructureCategory = (() => {
    if (!focusStructureId) return null;
    try {
      return getStructureDefinition(focusStructureId).category;
    } catch {
      return null;
    }
  })();
  const focusCategoryReady =
    focusStructureCategory != null &&
    categoryOpen[focusStructureCategory] === true;

  useEffect(() => {
    if (!focusStructureId || !focusStructureCategory) return;
    setCategoryOpen((prev) => ({ ...prev, [focusStructureCategory]: true }));
    setOfficeCategoryOpen(officeId, focusStructureCategory, true);
  }, [focusStructureId, focusStructureCategory, officeId]);

  useEffect(() => {
    if (!focusStructureId || !focusCategoryReady) return;

    const cancelScroll = scrollProgressionCardIntoViewWhenReady(
      `structure-card-${focusStructureId}`,
      { align: "comfortable" },
    );
    const clearId = window.setTimeout(() => {
      dispatch({
        type: "SET_VIEW",
        view: "operations",
        structureFocusStructureId: null,
      });
    }, 2800);
    return () => {
      cancelScroll();
      window.clearTimeout(clearId);
    };
  }, [focusStructureId, focusCategoryReady, dispatch]);

  useEffect(() => {
    const seeded: Partial<Record<StructureCategory, boolean>> = {};
    for (const category of STRUCTURE_CATEGORY_ORDER) {
      const remembered = getOfficeCategoryOpen(officeId, category);
      if (remembered !== undefined) seeded[category] = remembered;
    }
    setCategoryOpen(seeded);
  }, [officeId]);

  function openStructureDetail(structure: StructureDefinition) {
    setDetailStructure(structure);
  }

  function renderStructureCard(structure: StructureDefinition) {
    const focused = focusStructureId === structure.id;
    const lockLines = structureProgressionLockNav(state, structure.id);
    const portraitArt =
      structureEssentialsPortrait(structure.id) ??
      structureDepartmentsPortrait(structure.id) ??
      structurePowerResearchPortrait(structure.id) ??
      structureRecruitmentPortrait(structure.id);
    const portraitEl = portraitArt ? (
      <StructureCardPortrait src={portraitArt.src} crop={portraitArt.crop} />
    ) : null;
    const withPortrait = Boolean(portraitEl);

    const level = locationStructures[structure.id];
    const projected = projectedStructures[structure.id];
    const maxed = isStructureCompletedAtSite(state, officeId, structure);
    const inProgress =
      isStructureQueuedAt(state, officeId, structure.id) && !maxed;
    const unlocked = isStructureUnlocked(state, structure.id);
    const cost = structureCost(state, officeId, structure.id);
    const blocker = structureUpgradeBlocker(
      state,
      officeId,
      structure,
      queueFull,
    );
    const blockerMessage = structureUpgradeBlockerDisplay(blocker);
    const canUpgrade =
      !readOnly && unlocked && !maxed && !inProgress && blocker === null;
    const canSell =
      !readOnly && canSellStructureLevel(state, officeId, structure.id);
    const sellRefund = structureDemolishRefund(state, officeId, structure.id);
    const sellBlocked = isStructureQueuedAt(state, officeId, structure.id);
    const targetLevel = inProgress
      ? projected
      : Math.min(level + 1, structure.maxLevel);
    const previewFrom = inProgress ? level : projected;
    const buildHours =
      structureBuildTimeMs(structure.id, targetLevel) / (3600 * 1000);
    const previewLines =
      maxed || inProgress || !unlocked
        ? []
        : structureUpgradePreviewLines(
            structure.id,
            previewFrom,
            targetLevel,
          ).filter((line) => line.label !== "Build time");
    const completedLines = maxed
      ? structureCompletedResultLines(structure.id, level)
      : [];
    const compactBonus = formatCompactBonus(completedLines);
    const levelLabel =
      structure.maxLevel > 1 ? `Lv ${level}/${structure.maxLevel}` : `Lv ${level}`;

    const upgradeButtonLabel = structureUpgradeButtonLabel({
      unlocked,
      readOnly,
      maxed,
      inProgress,
      queueFull,
    });

    const showBlockerMessage =
      Boolean(blockerMessage) && !maxed && !inProgress && unlocked && !queueFull;

    const portraitCardClasses = withPortrait
      ? " recruitment-card-compact recruitment-card-with-portrait"
      : "";

    function renderPortraitCompactActiveBody() {
      const headBlock = (
        <div className="structure-head">
          <ProgressionNameButton
            name={structure.name}
            onClick={() => openStructureDetail(structure)}
          />
          {unlocked ? (
            <div className="structure-level-meta">
              <span className="structure-level-current">
                Lv {level} → {targetLevel}
              </span>
            </div>
          ) : (
            <span>Locked</span>
          )}
        </div>
      );

      const showBuildMeta = unlocked && !inProgress;

      const actionsRow = (
        <div className="recruitment-hire-actions structure-build-actions">
          <span className="recruitment-queue-btn-hint-wrap">
            <button
              type="button"
              className="btn primary recruitment-queue-btn"
              disabled={!canUpgrade}
              onClick={() =>
                dispatch({
                  type: "BUY_STRUCTURE",
                  structureId: structure.id,
                  locationId: officeId,
                })
              }
            >
              {upgradeButtonLabel}
            </button>
          </span>
        </div>
      );

      const metaBlock = (
        <div className="recruitment-hire-meta">
          {showBuildMeta ? (
            <div className="recruitment-hire-meta-cost">
              <StructureCostLine
                state={state}
                officeId={officeId}
                cost={cost}
                layout="line"
                prefix=""
                inline
              />
              {buildHours > 0 ? (
                <>
                  <span className="structure-cost-sep">·</span>
                  <span className="recruitment-time-inline">
                    {formatQueueTimeHours(buildHours)}
                  </span>
                </>
              ) : null}
            </div>
          ) : null}
          {actionsRow}
        </div>
      );

      return (
        <>
          {headBlock}
          {metaBlock}
          {showBlockerMessage ? (
            <p className="structure-blocker">{blockerMessage}</p>
          ) : null}
          {structure.officeSlotsWhenBuilt > 0 ? (
            <p className="structure-space-line compact-stack-line">
              <span className="compact-stack-label">Office slot:</span>{" "}
              {structure.officeSlotsWhenBuilt}
            </p>
          ) : null}
          <p
            className="structure-desc muted recruitment-role recruitment-role-footer"
            title={structure.description}
          >
            {structure.description}
          </p>
        </>
      );
    }

    if (maxed) {
      if (withPortrait) {
        const maxedCompactBody = (
          <>
            <div className="structure-head">
              <ProgressionNameButton
                name={structure.name}
                onClick={() => openStructureDetail(structure)}
              />
              <div className="structure-level-meta">
                <span className="structure-level-current">{levelLabel}</span>
              </div>
            </div>
            <div className="recruitment-hire-meta">
              <div className="recruitment-hire-actions structure-build-actions">
                <button
                  type="button"
                  className="btn primary recruitment-queue-btn"
                  disabled
                >
                  Max
                </button>
              </div>
            </div>
            <p
              className="structure-desc muted recruitment-role recruitment-role-footer"
              title={structure.description}
            >
              {structure.description}
            </p>
          </>
        );

        return (
          <li
            key={structure.id}
            id={`structure-card-${structure.id}`}
            className={`structure-card structure-card-upgrade research-card-completed progression-card-maxed${portraitCardClasses}${
              focused ? " progression-focus-target" : ""
            }`}
          >
            <div className="recruitment-card-split">
              <ProgressionCardPortraitColumn
                portrait={portraitEl}
                lockLines={lockLines}
                dispatch={dispatch}
                showLockOverlay={false}
              />
              <div className="recruitment-card-main">{maxedCompactBody}</div>
            </div>
          </li>
        );
      }

      const maxedBody = (
        <>
        <ProgressionMaxedCard
          name={structure.name}
          levelLabel={levelLabel}
          compactBonus={compactBonus}
          onNameClick={() => openStructureDetail(structure)}
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
          {!withPortrait ? (
            <p className="structure-desc muted">{structure.description}</p>
          ) : null}
          {level > 0 && (
            <button
              type="button"
              className="btn btn-muted structure-sell-btn"
              disabled={!canSell}
              onClick={() => {
                if (!canSell || !sellRefund) return;
                setSellConfirm({
                  structureId: structure.id,
                  structureName: structure.name,
                  refund: sellRefund,
                });
              }}
            >
              {!canSell && sellBlocked
                ? "Queued — can't sell"
                : "Sell 1 level"}
            </button>
          )}
        </ProgressionMaxedCard>
        {withPortrait ? (
          <p
            className="structure-desc muted recruitment-role recruitment-role-footer"
            title={structure.description}
          >
            {structure.description}
          </p>
        ) : null}
      </>
      );

      return (
        <li
          key={structure.id}
          id={`structure-card-${structure.id}`}
          className={`structure-card structure-card-upgrade research-card-completed progression-card-maxed${portraitCardClasses}${
            focused ? " progression-focus-target" : ""
          }`}
        >
          {withPortrait ? (
            <div className="recruitment-card-split">
              {portraitEl}
              <div className="recruitment-card-main">{maxedBody}</div>
            </div>
          ) : (
            maxedBody
          )}
        </li>
      );
    }

    const activeBody = withPortrait ? (
      renderPortraitCompactActiveBody()
    ) : (
      <>
        <div className="structure-head">
          <ProgressionNameButton
            name={structure.name}
            onClick={() => openStructureDetail(structure)}
          />
          {unlocked ? (
            <div className="structure-level-meta">
              <span className="structure-level-current">
                Lv {level} → {targetLevel}
              </span>
            </div>
          ) : (
            <span>Locked</span>
          )}
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
                officeId={officeId}
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
        {showBlockerMessage ? (
          <p className="structure-blocker">{blockerMessage}</p>
        ) : null}
        <p className="structure-desc muted">{structure.description}</p>
        {!unlocked && lockLines.length > 0 && !withPortrait ? (
          <ProgressionLockRequirements lines={lockLines} dispatch={dispatch} />
        ) : null}
        {structure.officeSlotsWhenBuilt > 0 ? (
          <p className="structure-space-line compact-stack-line">
            <span className="compact-stack-label">Office slot:</span>{" "}
            {structure.officeSlotsWhenBuilt}
          </p>
        ) : null}
        <div className="structure-card-actions">
          <button
            type="button"
            className="btn"
            disabled={!canUpgrade}
            onClick={() =>
              dispatch({
                type: "BUY_STRUCTURE",
                structureId: structure.id,
                locationId: officeId,
              })
            }
          >
            {upgradeButtonLabel}
          </button>
          {level > 0 && (
            <button
              type="button"
              className="btn btn-muted structure-sell-btn"
              disabled={!canSell}
              onClick={() => {
                if (!canSell || !sellRefund) return;
                setSellConfirm({
                  structureId: structure.id,
                  structureName: structure.name,
                  refund: sellRefund,
                });
              }}
            >
              {!canSell && sellBlocked
                ? "Queued — can't sell"
                : "Sell 1 level"}
            </button>
          )}
        </div>
      </>
    );

    return (
      <li
        key={structure.id}
        id={`structure-card-${structure.id}`}
        className={`structure-card structure-card-upgrade${
          unlocked ? "" : " progression-locked"
        }${portraitCardClasses}${focused ? " progression-focus-target" : ""}`}
      >
        {withPortrait ? (
          <div className="recruitment-card-split">
            <ProgressionCardPortraitColumn
              portrait={portraitEl}
              lockLines={lockLines}
              dispatch={dispatch}
              showLockOverlay={!unlocked}
            />
            <div className="recruitment-card-main">{activeBody}</div>
          </div>
        ) : (
          activeBody
        )}
      </li>
    );
  }

  function collapseAllStructureCategories() {
    for (const category of STRUCTURE_CATEGORY_ORDER) {
      setOfficeCategoryOpen(officeId, category, false);
    }
    setCategoryOpen((prev) => {
      const next = { ...prev };
      for (const category of STRUCTURE_CATEGORY_ORDER) {
        next[category] = false;
      }
      return next;
    });
  }

  return (
    <div
      className={`office-structures-panel${readOnly ? " office-structures-readonly" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      {showBuildQueue ? (
        <OfficeBuildQueueSection
          state={state}
          dispatch={dispatch}
          officeId={officeId}
        />
      ) : null}
      {siteSummary}
      {!readOnly ? (
        <ProgressionCatalogToolbar
          onCollapseAll={collapseAllStructureCategories}
          filterToggle={{
            label: "Hide maxed",
            checked: hideCompleted,
            onChange: onHideCompletedChange,
          }}
        />
      ) : null}
      {STRUCTURE_CATEGORY_ORDER.map((category) => {
        const items = sortStructuresForBuildTab(
          category,
          structurePanelStructures().filter(
            (structure) => structure.category === category,
          ),
        ).filter(
          (structure) =>
            !hideCompleted ||
            !isStructureCompletedAtSite(state, officeId, structure),
        );
        const expansionDef = getStructureDefinition(OFFICE_EXPANSION_STRUCTURE_ID);
        const showOfficeExpansion =
          category === "departments" &&
          !readOnly &&
          (!hideCompleted ||
            !isStructureCompletedAtSite(state, officeId, expansionDef));
        if (items.length === 0 && !showOfficeExpansion) return null;

        const maxedCount = items.filter((structure) =>
          isStructureCompletedAtSite(state, officeId, structure),
        ).length;
        const remembered = categoryOpen[category];
        const open = remembered ?? false;

        return (
          <ProgressionCategorySection
            key={category}
            title={STRUCTURE_CATEGORY_LABELS[category]}
            defaultOpen={false}
            open={open}
            onOpenChange={(next) => {
              if (next === open) return;
              setOfficeCategoryOpen(officeId, category, next);
              setCategoryOpen((prev) => ({ ...prev, [category]: next }));
            }}
            maxedCount={maxedCount}
            totalCount={items.length}
            bannerInSummary
            banner={
              <SceneBanner
                src={OFFICE_CATEGORY_SCENE[category].src}
                storageKey={OFFICE_CATEGORY_SCENE[category].storageKey}
                panZoomFactor={OFFICE_CATEGORY_SCENE[category].panZoomFactor}
                focalYPercent={OFFICE_CATEGORY_SCENE[category].focalYPercent}
                focalXPercent={OFFICE_CATEGORY_SCENE[category].focalXPercent}
                pannable={OFFICE_CATEGORY_SCENE[category].pannable}
              />
            }
          >
            <ul
              className={`structure-list ${
                category === "essentials" ||
                category === "departments" ||
                category === "infrastructure" ||
                category === "staffing"
                  ? "recruitment-grid"
                  : "progression-grid"
              }`}
            >
              {showOfficeExpansion
                ? renderStructureCard(expansionDef)
                : null}
              {items.map(renderStructureCard)}
            </ul>
          </ProgressionCategorySection>
        );
      })}
      {sellConfirm && (
        <ConfirmDialog
          title="Sell structure level?"
          message={
            <>
              Remove one level of <strong>{sellConfirm.structureName}</strong> at
              this site?
            </>
          }
          confirmLabel="Sell level"
          cancelLabel="Keep"
          refund={sellConfirm.refund}
          refundNote="(50% of that level's upgrade cost)"
          onConfirm={() => {
            dispatch({
              type: "DOWNGRADE_STRUCTURE",
              structureId: sellConfirm.structureId,
              locationId: officeId,
            });
            setSellConfirm(null);
          }}
          onCancel={() => setSellConfirm(null)}
        />
      )}
      {detailStructure && (() => {
        const detailLevel =
          state.structureLevelsByLocation[officeId][detailStructure.id];
        const detailCanSell =
          !readOnly &&
          canSellStructureLevel(state, officeId, detailStructure.id);
        const detailSellBlocked = isStructureQueuedAt(
          state,
          officeId,
          detailStructure.id,
        );
        return (
          <ProgressionDetailDialog
            {...buildStructureDetailModel(state, officeId, detailStructure)}
            onClose={() => setDetailStructure(null)}
            secondaryAction={
              detailLevel > 0
                ? {
                    label: detailCanSell
                      ? "Sell 1 level"
                      : detailSellBlocked
                        ? "Queued — can't sell"
                        : "Sell 1 level",
                    disabled: !detailCanSell,
                    title: detailSellBlocked
                      ? "Can't sell while this structure is in the build queue."
                      : undefined,
                    onClick: () => {
                      const refund = structureDemolishRefund(
                        state,
                        officeId,
                        detailStructure.id,
                      );
                      if (!detailCanSell || !refund) return;
                      setDetailStructure(null);
                      setSellConfirm({
                        structureId: detailStructure.id,
                        structureName: detailStructure.name,
                        refund,
                      });
                    },
                  }
                : undefined
            }
          />
        );
      })()}
    </div>
  );
}
