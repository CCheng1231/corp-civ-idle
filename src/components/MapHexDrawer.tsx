import { type Dispatch } from "react";
import {
  BRANCH_OPENING_COST,
  REGION_LABELS,
  branchEstablishBlockers,
  canEstablishBranch,
  towerById,
} from "../game/mapWorld";
import { formatNumber, formatResourceCost, OFFICE_LABELS } from "../game/constants";
import {
  formatJobDurationSec,
  jobPayoutPerHour,
} from "../game/jobBoard";
import {
  BUSINESS_TYPE_LABELS,
  JOB_SIZE_LABELS,
  jobDefinitionForPosting,
  postingsForTower,
} from "../game/jobs";
import type { AxialCoord, GameAction, GameState, TowerId } from "../game/types";
import {
  mapHexDistanceLabel,
  mapHexInfo,
  mapHexKindLabel,
  mapHexTitle,
  towerEngagementCount,
} from "./mapHexInfo";

interface MapHexDrawerProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  coord: AxialCoord;
  side: "left" | "right";
  onClose: () => void;
}

export function MapHexDrawer({
  state,
  dispatch,
  coord,
  side,
  onClose,
}: MapHexDrawerProps) {
  const info = mapHexInfo(coord, state);
  const title = mapHexTitle(info);
  const kindLabel = mapHexKindLabel(info);
  const distanceLabel = mapHexDistanceLabel(coord);

  function openSecretaryForTower(towerId: TowerId) {
    dispatch({ type: "SELECT_TOWER", towerId });
    dispatch({ type: "SET_VIEW", view: "office" });
  }

  return (
    <aside
      className={`map-hex-drawer is-open map-hex-drawer-side-${side}`}
      aria-label="Map location details"
    >
      <header className="map-hex-drawer-head">
        <div className="map-hex-drawer-head-text">
          <span className="map-hex-drawer-kind">{kindLabel}</span>
          <h3 className="map-hex-drawer-title">{title}</h3>
        </div>
        <button
          type="button"
          className="map-hex-drawer-close"
          onClick={onClose}
          aria-label="Close location panel"
        >
          ×
        </button>
      </header>

      <div className="map-hex-drawer-body">
        <dl className="map-hex-facts">
          <div>
            <dt>Region</dt>
            <dd>{REGION_LABELS[info.region]}</dd>
          </div>
          <div>
            <dt>Distance</dt>
            <dd>{distanceLabel}</dd>
          </div>
        </dl>

        {info.kind === "gov" && (
          <p className="map-hex-desc muted">
            The regional capital. Distance rings on the map radiate from here —
            metropolis near the center, countryside at the edges.
          </p>
        )}

        {info.kind === "office" && (
          <>
            <p className="map-hex-desc muted">
              Your {OFFICE_LABELS[info.officeId].toLowerCase()} — structures,
              hiring, and research queues run from this site.
            </p>
            <div className="map-hex-actions">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  dispatch({ type: "SELECT_OFFICE", officeId: info.officeId });
                  dispatch({ type: "SET_VIEW", view: "overview" });
                }}
              >
                Site overview
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  dispatch({ type: "SELECT_OFFICE", officeId: info.officeId });
                  dispatch({ type: "SET_VIEW", view: "operations" });
                }}
              >
                Upgrades
              </button>
            </div>
          </>
        )}

        {info.kind === "tower" && (() => {
          const tower = towerById(info.towerId);
          const postings = postingsForTower(state, info.towerId);
          const activeHere = towerEngagementCount(state, info.towerId);

          return (
            <>
              <p className="map-hex-desc muted">
                Client tower with contract postings. Crew capacity{" "}
                {tower.companyCrewCapacity} per engagement.
              </p>
              <dl className="map-hex-facts map-hex-facts-inline">
                <div>
                  <dt>Open jobs</dt>
                  <dd>{postings.length}</dd>
                </div>
                <div>
                  <dt>Your crews here</dt>
                  <dd>{activeHere}</dd>
                </div>
              </dl>
              {postings.length > 0 ? (
                <ul className="map-hex-job-list">
                  {postings.map((posting) => {
                    const def = jobDefinitionForPosting(posting);
                    return (
                      <li key={posting.id} className="map-hex-job-row">
                        <strong>{def.title}</strong>
                        <span className="muted">
                          T{def.tier} · {JOB_SIZE_LABELS[def.size]} ·{" "}
                          {BUSINESS_TYPE_LABELS[def.businessType]}
                        </span>
                        <span className="map-hex-job-meta">
                          {formatJobDurationSec(def.durationSec)} · $
                          {formatNumber(jobPayoutPerHour(posting))}/hr
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="muted map-hex-empty">No open postings right now.</p>
              )}
              <div className="map-hex-actions">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => openSecretaryForTower(info.towerId)}
                >
                  Open job board
                </button>
              </div>
            </>
          );
        })()}

        {info.kind === "commercial" && (
          <>
            <p className="map-hex-desc muted">
              {info.available
                ? "Available parcel for a branch office. Research Branch Management, then establish below."
                : state.branchEstablished
                  ? "This lot is no longer available."
                  : "Commercial real estate on the regional map."}
            </p>
            {info.available && !state.branchEstablished && (
              <>
                <p className="cost-line">
                  Opening cost: {formatResourceCost(BRANCH_OPENING_COST)}
                </p>
                {branchEstablishBlockers(state, coord).length > 0 && (
                  <ul className="branch-blockers map-hex-blockers">
                    {branchEstablishBlockers(state, coord).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
                <div className="map-hex-actions">
                  <button
                    type="button"
                    className="btn primary"
                    disabled={!canEstablishBranch(state, coord)}
                    onClick={() =>
                      dispatch({
                        type: "ESTABLISH_BRANCH",
                        coord,
                      })
                    }
                  >
                    Establish branch here
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {info.kind === "terrain" && (
          <p className="map-hex-desc muted">
            Undeveloped hex in the {REGION_LABELS[info.region].toLowerCase()}{" "}
            band. Office towers and commercial lots mark where work is available.
          </p>
        )}
      </div>
    </aside>
  );
}
