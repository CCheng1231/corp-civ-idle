import {
  BASE_LOCATION_POWER,
  BASE_OFFICE_SPACE,
  formatNumber,
  officeSpaceAvailable,
  powerAvailable,
} from "../game/constants";
import type { GameState, OfficeLocationId } from "../game/types";

interface OfficeSiteSummaryProps {
  state: GameState;
  officeId: OfficeLocationId;
  /** banner = Build tab strip below portrait (Space + Power only). */
  variant?: "full" | "inline" | "expansion" | "beside" | "banner";
}

/** Build tab: site Space / Power (office expansion lives in Departments). */
export function OfficeSiteSummary({
  state,
  officeId,
  variant = "full",
}: OfficeSiteSummaryProps) {
  const loc = state.locationStats?.[officeId] ?? {
    power: BASE_LOCATION_POWER,
    officeSpace: BASE_OFFICE_SPACE,
    officeSpaceUsed: 0,
    powerUsed: 0,
  };
  const freeSpace = officeSpaceAvailable(loc);

  const spaceStat = (
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
  );

  const powerStat = (
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
  );

  const capacityRow = (
    <div className="office-site-capacity-row">
      {spaceStat}
      {powerStat}
    </div>
  );

  if (variant === "beside" || variant === "banner") {
    return (
      <div
        className="office-site-summary office-site-summary-banner office-site-summary-banner--capacity-only"
        aria-label="Office space and power"
      >
        {capacityRow}
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

  return (
    <div className="office-site-summary office-site-summary-inline">
      {capacityRow}
    </div>
  );
}
