import { type Dispatch } from "react";
import {
  BRANCH_OPENING_COST,
  REGION_LABELS,
  TOWER_HEX_LABELS,
  branchEstablishBlockers,
  canEstablishBranch,
  commercialSiteAt,
  projectById,
  towerAtCoord,
  towerById,
  regionAtCoord,
} from "../game/mapWorld";
import {
  formatNumber,
} from "../game/constants";
import { formatTimerRemaining } from "../game/timers";
import {
  MAP_GOV,
  axialEquals,
  axialKey,
  axialToPixel,
  generateHexagonMap,
  hexBounds,
  hexPolygonPoints,
  officeAtCoord,
} from "../game/hexLayout";
import type { AxialCoord, GameAction, GameState } from "../game/types";

interface WorldViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

function hexVariant(
  coord: AxialCoord,
  state: GameState,
): "default" | "gov" | "hq" | "branch" | "tower" | "commercial" | "active" {
  if (axialEquals(coord, MAP_GOV)) return "gov";
  const officeId = officeAtCoord(coord, {
    established: state.branchEstablished,
    coord: state.branchCoord,
  });
  if (officeId === "hq") return "hq";
  if (officeId === "branch") return "branch";
  if (towerAtCoord(coord)) return "tower";
  if (commercialSiteAt(coord) && !state.branchEstablished) return "commercial";
  if (state.activeProject) {
    try {
      const project = projectById(state.activeProject.projectId);
      const tower = towerById(project.towerId);
      if (axialEquals(coord, tower.coord)) return "active";
    } catch {
      /* ignore */
    }
  }
  return "default";
}

function regionClass(coord: AxialCoord): string {
  return `hex-region-${regionAtCoord(coord)}`;
}

function hexOfficeLabel(
  officeId: ReturnType<typeof officeAtCoord>,
  towerId: ReturnType<typeof towerAtCoord>,
): { text: string; kind: "hq" | "branch" | "tower" } | null {
  if (officeId === "hq") return { text: "HQ", kind: "hq" };
  if (officeId === "branch") return { text: "Branch", kind: "branch" };
  if (towerId) {
    return { text: TOWER_HEX_LABELS[towerId], kind: "tower" };
  }
  return null;
}

export function WorldView({ state, dispatch }: WorldViewProps) {
  const cells = generateHexagonMap();
  const bounds = hexBounds(cells);

  let activeName: string | null = null;
  if (state.activeProject) {
    try {
      activeName = projectById(state.activeProject.projectId).name;
    } catch {
      activeName = null;
    }
  }

  const selectedCommercial = state.selectedCommercialHex
    ? commercialSiteAt(state.selectedCommercialHex)
    : undefined;
  const canOpenBranch = canEstablishBranch(state, state.selectedCommercialHex);
  const branchBlockers = branchEstablishBlockers(
    state,
    state.selectedCommercialHex,
  );

  return (
    <div className="world-view">
      <div className="world-header">
        <h2>Regional map</h2>
        <p>
          New firms start at <strong>HQ</strong> only. Research{" "}
          <strong>Branch Management</strong>, lease a{" "}
          <strong>commercial lot</strong> (yellow hex) to lease it — when
          requirements are met, clicking the lot opens the branch. Costs are paid
          from <strong>HQ</strong> (including {BRANCH_OPENING_COST.electricity}{" "}
          power at HQ).
        </p>
        <ul className="region-legend" aria-label="Map regions">
          {(
            Object.entries(REGION_LABELS) as [
              keyof typeof REGION_LABELS,
              string,
            ][]
          ).map(([id, label]) => (
            <li key={id} className={`region-legend-${id}`}>
              {label}
            </li>
          ))}
        </ul>
        <ul className="map-landmark-legend" aria-label="Landmarks">
          <li className="landmark-legend-gov">Gov</li>
          <li className="landmark-legend-hq">HQ</li>
          <li className="landmark-legend-branch">Branch</li>
          <li className="landmark-legend-tower">Office tower</li>
          <li className="landmark-legend-lot">Commercial lot</li>
          <li className="landmark-legend-job">Active job</li>
        </ul>
      </div>
      <div className="hex-map">
        <svg
          viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
          role="img"
          aria-label="Regional hex map"
        >
          {cells.map((coord) => {
            const { x, y } = axialToPixel(coord.q, coord.r);
            const variant = hexVariant(coord, state);
            const isDefault = variant === "default";
            const towerId = towerAtCoord(coord);
            const commercial = commercialSiteAt(coord);
            const officeId = officeAtCoord(coord, {
              established: state.branchEstablished,
              coord: state.branchCoord,
            });
            const isSelectedOffice = officeId === state.selectedOffice;
            const isSelectedTower = towerId === state.selectedTowerId;
            const isSelectedCommercial =
              state.selectedCommercialHex &&
              axialEquals(coord, state.selectedCommercialHex);

            const clickable =
              officeId !== null ||
              towerId !== null ||
              (commercial !== undefined && !state.branchEstablished);

            const mapLabel = hexOfficeLabel(officeId, towerId);

            return (
              <g key={axialKey(coord)} className="hex-cell">
                <polygon
                  points={hexPolygonPoints(x, y)}
                  className={[
                    "hex-tile",
                    isDefault ? regionClass(coord) : "",
                    `hex-tile-${variant}`,
                    officeId ? "hex-tile-office" : "",
                    isSelectedOffice ? "hex-tile-selected" : "",
                    isSelectedTower ? "hex-tile-tower-selected" : "",
                    isSelectedCommercial ? "hex-tile-commercial-selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    if (officeId) {
                      dispatch({ type: "SELECT_OFFICE", officeId });
                    } else if (towerId) {
                      dispatch({ type: "SELECT_TOWER", towerId });
                      dispatch({ type: "SET_VIEW", view: "world" });
                    } else if (commercial && !state.branchEstablished) {
                      if (canEstablishBranch(state, coord)) {
                        dispatch({ type: "ESTABLISH_BRANCH", coord: { ...coord } });
                      } else {
                        dispatch({
                          type: "SELECT_COMMERCIAL_HEX",
                          coord: { ...coord },
                        });
                      }
                    }
                  }}
                  style={{ cursor: clickable ? "pointer" : "default" }}
                />
                {mapLabel && (
                  <text
                    x={x}
                    y={y}
                    className={`hex-label hex-label-${mapLabel.kind}`}
                    textAnchor="middle"
                    dominantBaseline="central"
                    pointerEvents="none"
                  >
                    {mapLabel.text}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {!state.branchEstablished && (
        <div className="branch-setup-panel">
          <h3>Open a branch</h3>
          <p className="muted">
            1) Research Branch Management · 2) Click a yellow commercial lot ·
            3) Pay opening costs at HQ (cash, connection, REP, and power)
          </p>
          <p className="cost-line">
            Opening cost:{" "}
            {Object.entries(BRANCH_OPENING_COST)
              .map(([k, v]) =>
                k === "electricity"
                  ? `power ${formatNumber(v ?? 0)}`
                  : `${k} ${formatNumber(v ?? 0)}`,
              )
              .join(" · ")}
          </p>
          {selectedCommercial && (
            <p>
              Selected site: <strong>{selectedCommercial.label}</strong> (
              {REGION_LABELS[selectedCommercial.region]})
            </p>
          )}
          {branchBlockers.length > 0 && (
            <ul className="branch-blockers">
              {branchBlockers.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="btn primary"
            disabled={!canOpenBranch}
            onClick={() =>
              dispatch({
                type: "ESTABLISH_BRANCH",
                coord: state.selectedCommercialHex,
              })
            }
          >
            Establish branch at selected lot
          </button>
        </div>
      )}

      {activeName && state.activeProject && (
        <div className="travel-banner">
          Crew on contract: <strong>{activeName}</strong> —{" "}
          {formatTimerRemaining(
            state,
            state.activeProject.endsAt,
            Date.now(),
          ).replace("Finishing…", "Completing…")}
        </div>
      )}
    </div>
  );
}
