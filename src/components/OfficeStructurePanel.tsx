import { useState, type Dispatch } from "react";
import {
  structurePanelStructures,
  STRUCTURE_CATEGORY_LABELS,
  STRUCTURE_CATEGORY_ORDER,
  MAX_STRUCTURE_QUEUE,
  canBuildStructure,
  canSellStructureLevel,
  formatNumber,
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
import {
  ProgressionCategorySection,
  ProgressionMaxedCard,
} from "./progressionUi";
import { StructureBuildQueueList, QueueSection } from "./StructureBuildQueueList";
import { StructureCostLine } from "./StructureCostLine";
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
} from "../game/types";

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
  if (/Power at this site/i.test(blocker)) return null;
  if (/Need \d/.test(blocker) && /\(have /i.test(blocker)) return null;
  return blocker;
}

interface OfficeStructurePanelProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  officeId: OfficeLocationId;
}

export function OfficeStructurePanel({
  state,
  dispatch,
  officeId,
}: OfficeStructurePanelProps) {
  const locationStructures = state.structureLevelsByLocation[officeId];
  const projectedStructures = projectedStructureLevels(state, officeId);
  const buildQueue = state.structureQueues[officeId];
  const queueFull = isStructureQueueFull(state, officeId);
  const now = Date.now();
  const [hideCompleted, setHideCompleted] = useState(false);
  const [sellConfirm, setSellConfirm] = useState<{
    structureId: StructureId;
    structureName: string;
    refund: ResourceCost;
  } | null>(null);

  function renderStructureCard(structure: StructureDefinition) {
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
    const canUpgrade = unlocked && !maxed && !inProgress && blocker === null;
    const canSell = canSellStructureLevel(state, officeId, structure.id);
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

    if (maxed) {
      return (
        <li
          key={structure.id}
          className="structure-card structure-card-upgrade research-card-completed progression-card-maxed"
        >
          <ProgressionMaxedCard
            name={structure.name}
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
            <p className="structure-desc muted">{structure.description}</p>
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
        </li>
      );
    }

    return (
      <li
        key={structure.id}
        className={`structure-card structure-card-upgrade${unlocked ? "" : " progression-locked"}`}
      >
        <div className="structure-head">
          <strong>{structure.name}</strong>
          {unlocked ? (
            <div className="structure-level-meta">
              <span className="structure-level-current">
                Lv {level} → {targetLevel}
              </span>
              {structure.maxLevel > 1 ? (
                <span className="structure-level-max">
                  Max: {structure.maxLevel}
                </span>
              ) : null}
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
        {blockerMessage && !maxed && !inProgress && unlocked && (
          <p className="structure-blocker">{blockerMessage}</p>
        )}
        <p className="structure-desc muted">{structure.description}</p>
        {!unlocked && (
          <small className="cost-line">
            Requires: {structureUnlockRequirementLabel(structure.id)}
          </small>
        )}
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
            {!unlocked
              ? "Locked"
              : inProgress
                ? "In progress"
                : "Upgrade"}
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
      </li>
    );
  }

  return (
    <div className="office-structures-panel" onClick={(e) => e.stopPropagation()}>
      <QueueSection
        label="Build queue"
        count={buildQueue.length}
        max={MAX_STRUCTURE_QUEUE}
        headerExtra={
          <label className="progression-hide-completed-check">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(event) => setHideCompleted(event.target.checked)}
            />
            Hide maxed
          </label>
        }
      >
        <StructureBuildQueueList
          state={state}
          jobs={buildQueue}
          locationId={officeId}
          dispatch={dispatch}
          now={now}
        />
      </QueueSection>
      {STRUCTURE_CATEGORY_ORDER.map((category) => {
        const items = structurePanelStructures().filter(
          (structure) => structure.category === category,
        ).filter(
          (structure) =>
            !hideCompleted ||
            !isStructureCompletedAtSite(state, officeId, structure),
        );
        if (items.length === 0) return null;

        const maxedCount = items.filter((structure) =>
          isStructureCompletedAtSite(state, officeId, structure),
        ).length;
        const defaultOpen = items.some(
          (structure) =>
            !isStructureCompletedAtSite(state, officeId, structure) ||
            isStructureQueuedAt(state, officeId, structure.id),
        );

        return (
          <ProgressionCategorySection
            key={category}
            title={STRUCTURE_CATEGORY_LABELS[category]}
            defaultOpen={defaultOpen}
            maxedCount={maxedCount}
            totalCount={items.length}
          >
            <ul className="structure-list progression-grid">
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
    </div>
  );
}
