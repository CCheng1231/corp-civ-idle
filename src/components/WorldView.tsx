import { useState, type Dispatch } from "react";
import {
  REGION_LABELS,
  TOWER_HEX_LABELS,
  isAvailableCommercialLot,
  regionAtCoord,
  towerAtCoord,
} from "../game/mapWorld";
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
import { MapHexDrawer } from "./MapHexDrawer";

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
  if (isAvailableCommercialLot(coord, state)) return "commercial";
  if (state.jobEngagements.length > 0) {
    const activeTowerId =
      state.selectedTowerId ?? state.jobEngagements[0]?.towerId;
    if (activeTowerId && towerAtCoord(coord) === activeTowerId) {
      return "active";
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
  const [inspectedCoord, setInspectedCoord] = useState<AxialCoord | null>(null);
  const [drawerSide, setDrawerSide] = useState<"left" | "right">("right");
  const mapCenterX = bounds.minX + bounds.width / 2;

  function closeDrawer() {
    setInspectedCoord(null);
    dispatch({ type: "SELECT_TOWER", towerId: null });
    dispatch({ type: "SELECT_COMMERCIAL_HEX", coord: null });
  }

  function inspectHex(coord: AxialCoord) {
    const { x } = axialToPixel(coord.q, coord.r);
    setDrawerSide(x > mapCenterX ? "left" : "right");
    setInspectedCoord({ ...coord });

    const officeId = officeAtCoord(coord, {
      established: state.branchEstablished,
      coord: state.branchCoord,
    });
    const towerId = towerAtCoord(coord);

    if (officeId) {
      dispatch({ type: "SELECT_OFFICE", officeId });
      dispatch({ type: "SELECT_TOWER", towerId: null });
      dispatch({ type: "SELECT_COMMERCIAL_HEX", coord: null });
    } else if (towerId) {
      dispatch({ type: "SELECT_TOWER", towerId });
      dispatch({ type: "SELECT_COMMERCIAL_HEX", coord: null });
    } else if (isAvailableCommercialLot(coord, state)) {
      dispatch({ type: "SELECT_COMMERCIAL_HEX", coord: { ...coord } });
      dispatch({ type: "SELECT_TOWER", towerId: null });
    } else {
      dispatch({ type: "SELECT_TOWER", towerId: null });
      dispatch({ type: "SELECT_COMMERCIAL_HEX", coord: null });
    }
  }

  return (
    <div className="world-view">
      <div className="world-header">
        <h2>Regional map</h2>
        <p>
          Click any hex to inspect it — office towers, commercial lots, your
          sites, or open terrain. Towers list nearby contract postings; use{" "}
          <strong>Open job board</strong> when you are ready to bid.
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

      <div className="world-map-stage">
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
              const officeId = officeAtCoord(coord, {
                established: state.branchEstablished,
                coord: state.branchCoord,
              });
              const isInspected =
                inspectedCoord !== null && axialEquals(coord, inspectedCoord);

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
                      isInspected ? "hex-tile-inspected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => inspectHex(coord)}
                    style={{ cursor: "pointer" }}
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

        {inspectedCoord && (
          <MapHexDrawer
            state={state}
            dispatch={dispatch}
            coord={inspectedCoord}
            side={drawerSide}
            onClose={closeDrawer}
          />
        )}
      </div>
    </div>
  );
}
