import { type Dispatch, useEffect, useState } from "react";
import {
  BRANCH_OPENING_COST,
  REGION_LABELS,
  branchEstablishBlockers,
  canEstablishBranch,
  formatSiteRateBonusPercent,
  officeDisplayName,
  siteRateBonusForRegion,
  siteRateBonusesForState,
  towerById,
} from "../game/mapWorld";
import {
  formatNumber,
  formatResourceCost,
  OFFICE_LABELS,
} from "../game/constants";
import {
  formatJobDurationSec,
  jobPayoutPerHour,
} from "../game/jobBoard";
import {
  BUSINESS_TYPE_LABELS,
  JOB_SIZE_LABELS,
  engagementStatusLabel,
  jobDefinitionForPosting,
  postingsForTower,
} from "../game/jobs";
import {
  formatAssignmentSummary,
  totalAssigned,
} from "../game/unitEffects";
import type {
  AxialCoord,
  GameAction,
  GameState,
  JobEngagement,
  TowerId,
} from "../game/types";
import {
  mapHexDistanceLabel,
  mapHexInfo,
  mapHexKindLabel,
  mapHexTitle,
} from "./mapHexInfo";

interface MapHexDrawerProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  coord: AxialCoord;
  side: "left" | "right";
  onClose: () => void;
}

function engagementsAtTower(
  state: GameState,
  towerId: TowerId,
): JobEngagement[] {
  return state.jobEngagements.filter((engagement) => engagement.towerId === towerId);
}

function OfficeDrawerSection({
  state,
  dispatch,
  officeId,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  officeId: "hq" | "branch";
}) {
  const label = officeDisplayName(state, officeId);
  const siteBonus = siteRateBonusesForState(state)[officeId];
  const [draftName, setDraftName] = useState(state.branchName ?? "");

  useEffect(() => {
    setDraftName(state.branchName ?? "");
  }, [state.branchName]);

  return (
    <>
      <p className="map-hex-desc muted">
        Your {label} — structures, hiring, and research queues run from this
        site.
      </p>
      {siteBonus > 0 && (
        <p className="cost-line">
          Site bonus: +{formatSiteRateBonusPercent(siteBonus)} structure
          passives (temporary)
        </p>
      )}
      {officeId === "branch" && state.branchEstablished && (
        <label className="branch-rename-field">
          Branch name
          <input
            type="text"
            maxLength={48}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => {
              const next = draftName.trim();
              if (next && next !== state.branchName) {
                dispatch({ type: "RENAME_BRANCH", name: next });
              } else {
                setDraftName(state.branchName ?? "");
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        </label>
      )}
      <div className="map-hex-actions">
        <button
          type="button"
          className="btn"
          onClick={() => {
            dispatch({ type: "SELECT_OFFICE", officeId });
            dispatch({ type: "SET_VIEW", view: "overview" });
          }}
        >
          Site overview
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            dispatch({ type: "SELECT_OFFICE", officeId });
            dispatch({ type: "SET_VIEW", view: "operations" });
          }}
        >
          Upgrades
        </button>
      </div>
    </>
  );
}

export function MapHexDrawer({
  state,
  dispatch,
  coord,
  side,
  onClose,
}: MapHexDrawerProps) {
  const info = mapHexInfo(coord, state);
  const title = mapHexTitle(info, state);
  const kindLabel = mapHexKindLabel(info);
  const distanceLabel = mapHexDistanceLabel(coord);
  const now = Date.now();

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
          <OfficeDrawerSection
            state={state}
            dispatch={dispatch}
            officeId={info.officeId}
          />
        )}

        {info.kind === "tower" && (() => {
          const tower = towerById(info.towerId);
          const postings = postingsForTower(state, info.towerId);
          const active = engagementsAtTower(state, info.towerId);
          const activePostingIds = new Set(active.map((e) => e.postingId));
          const crewOnSite = active.reduce(
            (sum, engagement) => sum + totalAssigned(engagement.crewAssigned),
            0,
          );

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
                  <dt>Task forces</dt>
                  <dd>{active.length}</dd>
                </div>
                <div>
                  <dt>Crew here</dt>
                  <dd>{crewOnSite}</dd>
                </div>
              </dl>

              {active.length > 0 ? (
                <section className="map-hex-active-section" aria-label="Active task forces">
                  <h4 className="map-hex-section-title">On site now</h4>
                  <ul className="map-hex-job-list">
                    {active.map((engagement) => {
                      const posting = state.jobPostings.find(
                        (p) => p.id === engagement.postingId,
                      );
                      const def = posting
                        ? jobDefinitionForPosting(posting)
                        : null;
                      const crewCount = totalAssigned(engagement.crewAssigned);
                      return (
                        <li
                          key={engagement.id}
                          className="map-hex-job-row map-hex-job-row-active"
                        >
                          <strong>{def?.title ?? "Active assignment"}</strong>
                          <span className="map-hex-job-status">
                            {engagementStatusLabel(state, engagement, now)}
                          </span>
                          <span className="muted">
                            {crewCount} crew ·{" "}
                            {formatAssignmentSummary(engagement.crewAssigned)}
                          </span>
                          <span className="muted">
                            From {OFFICE_LABELS[engagement.officeId]}
                            {def
                              ? ` · shift ${formatJobDurationSec(def.durationSec)}`
                              : ""}
                          </span>
                          {engagement.phase === "working" &&
                          engagement.earnedSoFar > 0 ? (
                            <span className="map-hex-job-meta">
                              Earned so far $
                              {formatNumber(engagement.earnedSoFar)}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              {postings.length > 0 ? (
                <>
                  <h4 className="map-hex-section-title">Open postings</h4>
                  <ul className="map-hex-job-list">
                    {postings.map((posting) => {
                      const def = jobDefinitionForPosting(posting);
                      const engaged = activePostingIds.has(posting.id);
                      return (
                        <li
                          key={posting.id}
                          className={`map-hex-job-row${
                            engaged ? " map-hex-job-row-engaged" : ""
                          }`}
                        >
                          <strong>
                            {def.title}
                            {engaged ? (
                              <span className="map-hex-job-badge">Active</span>
                            ) : null}
                          </strong>
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
                </>
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
            <p className="cost-line">
              Region site bonus: +
              {formatSiteRateBonusPercent(
                siteRateBonusForRegion(info.region),
              )}{" "}
              structure passives if established here (temporary)
            </p>
            {info.available && !state.branchEstablished && (
              <>
                <p className="cost-line">
                  Opening cost: {formatResourceCost(BRANCH_OPENING_COST)}
                </p>
                <p className="cost-line muted">
                  Also consumes 1 Branch Manager from HQ
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
