import { type Dispatch } from "react";
import {
  BASE_LOCATION_POWER,
  BASE_OFFICE_SPACE,
  OFFICE_EXPANSION_STRUCTURE_ID,
  canAffordCostPart,
  formatNumber,
  getStructureDefinition,
  officeSpaceAvailable,
  powerAvailable,
  isStructureQueueFull,
  projectedStructureLevels,
  resourceCostParts,
} from "../game/constants";
import { structureCost } from "../game/engine";
import { effectAtStructureLevel } from "../game/structureBalance";
import { formatCompactCost } from "./CompactStack";
import { structureUpgradeBlocker, structureUpgradeBlockerDisplay } from "./OfficeStructurePanel";
import type { GameAction, GameState, OfficeLocationId } from "../game/types";

interface OfficeSiteSummaryProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  officeId: OfficeLocationId;
  /** inline = space/power; expansion = expand only; beside = capacity + expand; banner = below portrait like Home net worth */
  variant?: "full" | "inline" | "expansion" | "beside" | "banner";
}

export function OfficeSiteSummary({
  state,
  dispatch,
  officeId,
  variant = "full",
}: OfficeSiteSummaryProps) {
  const loc = state.locationStats?.[officeId] ?? {
    power: BASE_LOCATION_POWER,
    officeSpace: BASE_OFFICE_SPACE,
    officeSpaceUsed: 0,
    powerUsed: 0,
  };
  const structures = state.structureLevelsByLocation[officeId];

  const expansionDef = getStructureDefinition(OFFICE_EXPANSION_STRUCTURE_ID);
  const projectedExpansion =
    projectedStructureLevels(state, officeId).office_expansion;
  const expansionLevel = structures.office_expansion;
  const expansionMaxed = projectedExpansion >= expansionDef.maxLevel;
  const expansionCost = structureCost(
    state,
    officeId,
    OFFICE_EXPANSION_STRUCTURE_ID,
  );
  const spaceGain = expansionMaxed
    ? 0
    : Math.max(
        0,
        effectAtStructureLevel(
          OFFICE_EXPANSION_STRUCTURE_ID,
          projectedExpansion + 1,
        ) -
          effectAtStructureLevel(
            OFFICE_EXPANSION_STRUCTURE_ID,
            projectedExpansion,
          ),
      );
  const expansionBlocker = structureUpgradeBlocker(
    state,
    officeId,
    expansionDef,
    isStructureQueueFull(state, officeId),
  );
  const expansionBlockerMessage =
    structureUpgradeBlockerDisplay(expansionBlocker);
  const canExpand = !expansionMaxed && !expansionBlocker;
  const freeSpace = officeSpaceAvailable(loc);
  const expansionCostParts = resourceCostParts(expansionCost);

  const capacityRow = (
    <div className="office-site-capacity-row">
      <div className="office-site-capacity-stat">
        <span className="office-site-capacity-label">Space</span>
        <span className="office-site-capacity-values">
          <strong>
            {formatNumber(loc.officeSpaceUsed)}/{formatNumber(loc.officeSpace)}
          </strong>
          <span className="office-site-capacity-free">
            {formatNumber(freeSpace)} free
          </span>
        </span>
      </div>
      <div className="office-site-capacity-stat">
        <span className="office-site-capacity-label">Power</span>
        <span className="office-site-capacity-values">
          <strong>
            {formatNumber(loc.powerUsed)}/{formatNumber(loc.power)}
          </strong>
          <span className="office-site-capacity-free">
            {formatNumber(powerAvailable(loc))} free
          </span>
        </span>
      </div>
    </div>
  );

  const expansionBesideRow = (
    <div className="office-site-expand-beside">
      <div className="office-expand-meta">
        <span className="office-expand-meta-label">Office expand</span>
        {expansionMaxed ? (
          <span className="muted">Maxed</span>
        ) : (
          <>
            <span className="office-expand-level">
              Lv {expansionLevel} → {expansionLevel + 1}
            </span>
            {spaceGain > 0 && (
              <span className="office-expand-slots">
                +{formatCompactCost(spaceGain)} slots
              </span>
            )}
          </>
        )}
      </div>
      {!expansionMaxed && (
        <button
          type="button"
          className="map-hex-job-send office-expand-btn-mini"
          disabled={!canExpand}
          title={expansionBlockerMessage ?? undefined}
          onClick={() =>
            dispatch({
              type: "BUY_STRUCTURE",
              structureId: OFFICE_EXPANSION_STRUCTURE_ID,
              locationId: officeId,
            })
          }
        >
          {expansionCostParts.length > 0 ? (
            <span className="office-expand-btn-cost">
              {expansionCostParts.map((part, index) => (
                <span key={part.key}>
                  {index > 0 && (
                    <span className="office-expand-btn-sep"> · </span>
                  )}
                  <span className="compact-stack-label">{part.label}:</span>{" "}
                  <span
                    className={
                      canAffordCostPart(state, officeId, part)
                        ? "structure-cost-affordable"
                        : "structure-cost-unaffordable"
                    }
                  >
                    {formatCompactCost(part.amount)}
                  </span>
                </span>
              ))}
            </span>
          ) : (
            "Office expand"
          )}
        </button>
      )}
      {expansionBlockerMessage &&
        !expansionMaxed &&
        variant !== "banner" && (
        <span className="muted office-site-expand-blocker">
          {expansionBlockerMessage}
        </span>
      )}
    </div>
  );

  const expansionRow = (
    <div className="office-site-expand-row office-site-expand-row-compact">
      <button
        type="button"
        className="btn office-expand-btn"
        disabled={!canExpand}
        title={expansionBlockerMessage ?? undefined}
        onClick={() =>
          dispatch({
            type: "BUY_STRUCTURE",
            structureId: OFFICE_EXPANSION_STRUCTURE_ID,
            locationId: officeId,
          })
        }
      >
        <span className="office-expand-btn-title">
          {expansionMaxed
            ? "Office expansion maxed"
            : `Expand office · Lv ${expansionLevel} → ${expansionLevel + 1}`}
        </span>
        <span className="office-expand-btn-detail">
          {!expansionMaxed && expansionCostParts.length > 0 && (
            <span className="office-expand-btn-cost">
              {expansionCostParts.map((part, index) => (
                <span key={part.key}>
                  {index > 0 && (
                    <span className="office-expand-btn-sep"> · </span>
                  )}
                  <span className="compact-stack-label">
                    {part.label}:
                  </span>{" "}
                  <span
                    className={
                      canAffordCostPart(state, officeId, part)
                        ? "structure-cost-affordable"
                        : "structure-cost-unaffordable"
                    }
                  >
                    {formatCompactCost(part.amount)}
                  </span>
                </span>
              ))}
              {spaceGain > 0 && (
                <>
                  <span className="office-expand-btn-sep"> · </span>
                  <span className="muted">+{formatCompactCost(spaceGain)} slots</span>
                </>
              )}
            </span>
          )}
        </span>
      </button>
      {expansionBlockerMessage && !expansionMaxed && (
        <span className="muted office-site-expand-blocker">
          {expansionBlockerMessage}
        </span>
      )}
    </div>
  );

  if (variant === "beside") {
    return (
      <div className="office-site-summary office-site-summary-beside">
        {capacityRow}
        {expansionBesideRow}
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div
        className="office-site-summary office-site-summary-banner"
        aria-label="Office space, power, and expansion"
      >
        {capacityRow}
        {expansionBesideRow}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className="office-site-summary office-site-summary-inline">
        {capacityRow}
      </div>
    );
  }

  if (variant === "expansion") {
    return (
      <div className="office-site-summary office-site-summary-expansion">
        {expansionBesideRow}
      </div>
    );
  }

  return (
    <div className="office-site-summary office-site-summary-compact">
      {capacityRow}
      {expansionRow}
    </div>
  );
}
