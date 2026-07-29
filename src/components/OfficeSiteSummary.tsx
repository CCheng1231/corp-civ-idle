import { type Dispatch } from "react";
import {
  BASE_LOCATION_POWER,
  BASE_OFFICE_SPACE,
  CONTRACTOR_TYPES,
  OFFICE_EXPANSION_STRUCTURE_ID,
  STRUCTURES,
  formatNumber,
  getStructureDefinition,
  officeSpaceAvailable,
  powerAvailable,
  rosterAt,
  totalWorkforce,
} from "../game/constants";
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
  const pendingHires = state.recruitmentJobs.filter((j) => j.officeId === officeId)
    .length;

  const expansionDef = getStructureDefinition(OFFICE_EXPANSION_STRUCTURE_ID);
  const expansionLevel = structures.office_expansion;
  const expansionMaxed = expansionLevel >= expansionDef.maxLevel;
  const expansionBlocker = structureUpgradeBlocker(
    state,
    officeId,
    expansionDef,
    false,
  );
  const canExpand = !expansionMaxed && !expansionBlocker;

  return (
    <div className="office-site-summary">
      <div className="office-site-summary-stats">
        <div className="location-stat">
          <span className="location-stat-label">Office space</span>
          <strong>
            {formatNumber(loc.officeSpaceUsed)} / {formatNumber(loc.officeSpace)}
          </strong>
          <small>{formatNumber(officeSpaceAvailable(loc))} free</small>
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
          className="btn btn-compact"
          disabled={!canExpand}
          title={
            expansionBlocker ??
            (expansionMaxed
              ? "Maximum expansion reached"
              : `Expand office (Lv ${expansionLevel} → ${expansionLevel + 1})`)
          }
          onClick={() =>
            dispatch({
              type: "BUY_STRUCTURE",
              structureId: OFFICE_EXPANSION_STRUCTURE_ID,
              locationId: officeId,
            })
          }
        >
          {expansionMaxed ? "Office expansion maxed" : "Expand office space"}
        </button>
        {expansionBlocker && !expansionMaxed && (
          <span className="muted office-site-expand-blocker">{expansionBlocker}</span>
        )}
      </div>
      <div className="office-site-summary-units">
        <h4>Units</h4>
        <ul className="office-site-staff-list">
          {CONTRACTOR_TYPES.map((type) => (
            <li key={type.id}>
              <span className="office-site-staff-role">{type.role}</span>
              <span className="office-site-staff-count">×{roster[type.id]}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="office-site-summary-structures">
        <h4>Structure levels</h4>
        <ul className="office-site-structure-levels">
          {STRUCTURES.map((def) => (
            <li key={def.id}>
              <span>{def.name}</span>
              <strong>
                Lv {structures[def.id]}/{def.maxLevel}
              </strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
