import { type Dispatch } from "react";
import { formatLogCostCell } from "../game/logbook";
import {
  structurePanelStructures,
  MAX_STRUCTURE_QUEUE,
  canBuildStructure,
  canSellStructureLevel,
  formatNumber,
  isStructureQueueFull,
  isStructureQueuedAt,
  projectedStructureLevels,
  powerAvailable,
  splitResourceCost,
} from "../game/constants";
import {
  structureCost,
  structureDemolishRefund,
} from "../game/engine";
import { StructureBuildQueueList } from "./StructureBuildQueueList";
import type {
  GameAction,
  GameState,
  OfficeLocationId,
  StructureDefinition,
} from "../game/types";

function formatUpgradeCost(cost: ReturnType<typeof structureCost>): string {
  return Object.entries(cost)
    .map(([k, v]) =>
      k === "electricity"
        ? `power ${formatNumber(v ?? 0)}`
        : `${k} ${formatNumber(v ?? 0)}`,
    )
    .join(" · ");
}

export function structureUpgradeBlocker(
  state: GameState,
  officeId: OfficeLocationId,
  structure: StructureDefinition,
  queueFull: boolean,
): string | null {
  const projected = projectedStructureLevels(state, officeId)[structure.id];
  if (projected >= structure.maxLevel) return null;

  if (queueFull) return "Build queue full (2/2) at this site";

  if (!canBuildStructure(state, officeId, structure.id)) {
    return "Not enough office space at this site";
  }

  const cost = structureCost(state, officeId, structure.id);
  const { global, power } = splitResourceCost(cost);
  for (const [key, amount] of Object.entries(global)) {
    const k = key as keyof GameState["resources"];
    const need = amount ?? 0;
    if (state.resources[k] < need) {
      return `Need ${formatNumber(need)} ${k} (have ${formatNumber(state.resources[k])})`;
    }
  }

  const freePower = powerAvailable(state.locationStats[officeId]);
  if (power > freePower) {
    return `Need ${power} power at this site (${formatNumber(freePower)} free)`;
  }

  return null;
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

  return (
    <div className="office-structures-panel" onClick={(e) => e.stopPropagation()}>
      <p className="muted office-structures-intro">
        Upgrades queue at this site (build time in game hours = real time, max{" "}
        {MAX_STRUCTURE_QUEUE}). Sell refunds 50% of that level's upgrade cost.
      </p>
      {buildQueue.length > 0 && (
        <StructureBuildQueueList state={state} jobs={buildQueue} now={now} />
      )}
      <ul className="structure-list research-grid">
        {structurePanelStructures().map((structure) => {
          const level = locationStructures[structure.id];
          const projected = projectedStructures[structure.id];
          const maxed = projected >= structure.maxLevel;
          const cost = structureCost(state, officeId, structure.id);
          const blocker = structureUpgradeBlocker(
            state,
            officeId,
            structure,
            queueFull,
          );
          const canUpgrade = !maxed && blocker === null;
          const canSell = canSellStructureLevel(state, officeId, structure.id);
          const sellRefund = structureDemolishRefund(state, officeId, structure.id);
          const sellBlocked = isStructureQueuedAt(state, officeId, structure.id);

          return (
            <li key={structure.id} className="structure-card">
              <div className="structure-head">
                <strong>{structure.name}</strong>
                <span>
                  Lv {level}/{structure.maxLevel}
                </span>
              </div>
              {!maxed && (
                <p className="structure-cost-primary">
                  {formatUpgradeCost(cost)}
                </p>
              )}
              {blocker && !maxed && (
                <p className="structure-blocker">{blocker}</p>
              )}
              <p className="structure-desc muted">{structure.description}</p>
              <p className="cost-line muted structure-space-line">
                {structure.officeSlotsWhenBuilt > 0
                  ? `Uses ${structure.officeSlotsWhenBuilt} office slot while built (all levels)`
                  : "Does not consume an office slot"}
              </p>
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
                {maxed ? "Maxed" : "Upgrade"}
              </button>
              {level > 0 && (
                <button
                  type="button"
                  className="btn btn-muted structure-sell-btn"
                  disabled={!canSell}
                  onClick={() =>
                    dispatch({
                      type: "DOWNGRADE_STRUCTURE",
                      structureId: structure.id,
                      locationId: officeId,
                    })
                  }
                >
                  {!canSell && sellBlocked
                    ? "Queued — can't sell"
                    : "Sell 1 level"}
                </button>
              )}
              {canSell && sellRefund && (
                <small className="cost-line structure-refund-line">
                  Refund: {formatLogCostCell(sellRefund)}
                </small>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
