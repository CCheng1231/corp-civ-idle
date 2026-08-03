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
  rosterAt,
  totalWorkforce,
} from "../game/constants";
import { RECRUITMENT_UNITS } from "../game/recruitmentData";
import { structureCost } from "../game/engine";
import { effectAtStructureLevel } from "../game/structureBalance";
import { formatCompactCost } from "./CompactStack";
import { structureUpgradeBlocker } from "./OfficeStructurePanel";
import type { GameAction, GameState, OfficeLocationId } from "../game/types";

interface OfficeSiteSummaryProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  officeId: OfficeLocationId;
}

export function OfficeSiteSummary({
  state,
  dispatch,
  officeId,
}: OfficeSiteSummaryProps) {
  const loc = state.locationStats?.[officeId] ?? {
    power: BASE_LOCATION_POWER,
    officeSpace: BASE_OFFICE_SPACE,
    officeSpaceUsed: 0,
    powerUsed: 0,
  };
  const roster = rosterAt(state, officeId);
  const structures = state.structureLevelsByLocation[officeId];
  const pendingHires = state.recruitmentJobs
    .filter((j) => j.officeId === officeId)
    .reduce((sum, j) => sum + (j.count ?? 1), 0);

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
  const canExpand = !expansionMaxed && !expansionBlocker;
  const freeSpace = officeSpaceAvailable(loc);
  const expansionCostParts = resourceCostParts(expansionCost);

  return (
    <div className="office-site-summary">
      <div className="office-site-summary-stats">
        <div className="location-stat">
          <span className="location-stat-label">Office space</span>
          <strong>
            {formatNumber(loc.officeSpaceUsed)} / {formatNumber(loc.officeSpace)}
          </strong>
          <small>{formatNumber(freeSpace)} free</small>
        </div>
        <div className="location-stat">
          <span className="location-stat-label">Power</span>
          <strong>
            {formatNumber(loc.powerUsed)} / {formatNumber(loc.power)}
          </strong>
          <small>{formatNumber(powerAvailable(loc))} free</small>
        </div>
        <div className="location-stat">
          <span className="location-stat-label">Staff on site</span>
          <strong>{totalWorkforce(roster)}</strong>
          {pendingHires > 0 && <small>{pendingHires} hiring</small>}
        </div>
      </div>
      <div className="office-site-expand-row">
        <button
          type="button"
          className="btn btn-compact office-expand-btn"
          disabled={!canExpand}
          title={expansionBlocker ?? undefined}
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
        {expansionBlocker && !expansionMaxed && (
          <span className="muted office-site-expand-blocker">{expansionBlocker}</span>
        )}
      </div>
      <div className="office-site-summary-units">
        <h4>Units</h4>
        <ul className="office-site-staff-list">
          {RECRUITMENT_UNITS.filter((unit) => (roster[unit.id] ?? 0) > 0).map(
            (unit) => (
              <li key={unit.id}>
                <span className="office-site-staff-role">{unit.name}</span>
                <span className="office-site-staff-count">
                  ×{roster[unit.id] ?? 0}
                </span>
              </li>
            ),
          )}
        </ul>
        {RECRUITMENT_UNITS.every((unit) => (roster[unit.id] ?? 0) <= 0) && (
          <p className="muted">No units at this site.</p>
        )}
      </div>
    </div>
  );
}
