import { type Dispatch, useEffect, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  establishedBranchAtPad,
  isBranchOfficeId,
} from "../game/branchSites";
import {
  REGION_LABELS,
  branchEstablishBlockersForPad,
  branchManagementResearched,
  branchOpeningCostForPad,
  canEstablishBranchPad,
  commercialSiteAt,
  formatSiteRateBonusPercent,
  officeDisplayName,
  siteRateBonusForRegion,
  siteRateBonusesForState,
} from "../game/mapWorld";
import {
  canAffordCostPart,
  formatNumber,
  resourceCostParts,
} from "../game/constants";
import {
  formatJobDurationSec,
  jobPayoutPerHour,
} from "../game/jobBoard";
import {
  BUSINESS_TYPE_LABELS,
  COMPLETION_BANDS,
  completionBand,
  completionBandLabel,
  JOB_SIZE_LABELS,
  jobDefinitionForPosting,
  postingsForCommercialLot,
  postingsForTower,
} from "../game/jobs";
import { formatTimerRemainingCompact } from "../game/timers";
import type {
  AxialCoord,
  CompletionBand,
  GameAction,
  GameState,
  JobPosting,
  OfficeLocationId,
  ResourceCost,
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

function CompletionBandTip({
  postingId,
  band,
}: {
  postingId: string;
  band: CompletionBand;
}) {
  const tipId = `map-hex-completion-tip-${postingId}`;

  return (
    <span className="job-info-tip map-hex-job-completion-tip">
      <span
        className={`job-info-tip-value job-completion-band-${band}`}
        tabIndex={0}
        aria-describedby={tipId}
      >
        {completionBandLabel(band)}
      </span>
      <span id={tipId} className="job-info-tip-panel" role="tooltip">
        {COMPLETION_BANDS.map((option) => (
          <span
            key={option}
            className={`job-info-tip-row${option === band ? " is-current" : ""}`}
          >
            <span className="job-info-tip-mark" aria-hidden>
              {option === band ? "●" : "○"}
            </span>
            <span
              className={`job-info-tip-value job-completion-band-${option}`}
            >
              {completionBandLabel(option)}
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}

function OfficeDrawerSection({
  state,
  dispatch,
  officeId,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  officeId: OfficeLocationId;
}) {
  const label = officeDisplayName(state, officeId);
  const siteBonus = siteRateBonusesForState(state)[officeId] ?? 0;
  const [draftName, setDraftName] = useState(() => officeDisplayName(state, officeId));

  useEffect(() => {
    if (isBranchOfficeId(officeId)) {
      setDraftName(officeDisplayName(state, officeId));
    }
  }, [officeId, state.branchSites, state]);

  return (
    <>
      <p className="map-hex-desc muted">
        {label}. Build, hire, research here.
      </p>
      {siteBonus > 0 && (
        <p className="cost-line">
          Site bonus: +{formatSiteRateBonusPercent(siteBonus)} structure
          passives
        </p>
      )}
      {isBranchOfficeId(officeId) && (
        <label className="branch-rename-field">
          Branch name
          <input
            type="text"
            maxLength={48}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => {
              const next = draftName.trim();
              const current = officeDisplayName(state, officeId);
              if (next && next !== current) {
                dispatch({ type: "RENAME_BRANCH", name: next, officeId });
              } else {
                setDraftName(current);
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
    </>
  );
}

function HexContractsSection({
  state,
  coord,
  postings,
  isEngaged,
  onSend,
}: {
  state: GameState;
  coord: AxialCoord;
  postings: JobPosting[];
  isEngaged: (postingId: string) => boolean;
  onSend: (postingId: string) => void;
}) {
  const [contractsOpen, setContractsOpen] = useState(false);
  const now = Date.now();

  useEffect(() => {
    setContractsOpen(false);
  }, [coord.q, coord.r, postings.length]);

  return (
    <section className="map-hex-contracts-section" aria-label="Contracts">
      <button
        type="button"
        className={`map-hex-contracts-toggle${contractsOpen ? " is-open" : ""}`}
        aria-expanded={contractsOpen}
        onClick={() => setContractsOpen((open) => !open)}
      >
        <span className="map-hex-contracts-toggle-label">Contracts</span>
        <span className="map-hex-contracts-toggle-caret" aria-hidden>
          {contractsOpen ? "▾" : "▸"}
        </span>
      </button>

      {contractsOpen ? (
        <div className="map-hex-contracts-body">
          {postings.length > 0 ? (
            <>
              <h4 className="map-hex-section-title map-hex-section-title-sub">
                Open postings
              </h4>
              <ul className="map-hex-job-list">
                {postings.map((posting) => {
                  const def = jobDefinitionForPosting(posting);
                  const engaged = isEngaged(posting.id);
                  const band = completionBand(
                    posting.unitHoursCompleted,
                    def.unitHoursTotal,
                  );
                  return (
                    <li
                      key={posting.id}
                      className={`map-hex-job-row${
                        engaged ? " map-hex-job-row-engaged" : ""
                      }`}
                    >
                      <div className="map-hex-job-info">
                        <div className="map-hex-job-line map-hex-job-line-title">
                          <span className="map-hex-job-title">
                            {def.title}
                            {engaged ? (
                              <span className="map-hex-job-badge">Active</span>
                            ) : null}
                          </span>
                        </div>
                        <div className="map-hex-job-line map-hex-job-line-detail">
                          <div className="map-hex-job-detail-text">
                            <span className="map-hex-job-tier">
                              T{def.tier} · {JOB_SIZE_LABELS[def.size]} ·{" "}
                              {BUSINESS_TYPE_LABELS[def.businessType]}
                            </span>
                            <span className="map-hex-job-meta">
                              {formatJobDurationSec(def.durationSec)} ·{" "}
                              <CompletionBandTip
                                postingId={posting.id}
                                band={band}
                              />{" "}
                              ·{" "}
                              {formatTimerRemainingCompact(
                                state,
                                posting.expiresAt,
                                now,
                              )}{" "}
                              · ${formatNumber(jobPayoutPerHour(posting))}/hr
                            </span>
                          </div>
                          <button
                            type="button"
                            className="map-hex-job-send"
                            onClick={() => onSend(posting.id)}
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="muted map-hex-empty">No open postings right now.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function TowerContractsSection({
  state,
  dispatch,
  towerId,
  coord,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  towerId: TowerId;
  coord: AxialCoord;
}) {
  const postings = postingsForTower(state, towerId);
  const activePostingIds = new Set(
    state.jobEngagements
      .filter((engagement) => engagement.towerId === towerId)
      .map((engagement) => engagement.postingId),
  );

  function sendToSecretary(postingId: string) {
    dispatch({ type: "SELECT_TOWER", towerId });
    dispatch({
      type: "SET_VIEW",
      view: "office",
      jobFocusPostingId: postingId,
    });
  }

  return (
    <HexContractsSection
      state={state}
      coord={coord}
      postings={postings}
      isEngaged={(postingId) => activePostingIds.has(postingId)}
      onSend={sendToSecretary}
    />
  );
}

function BranchOpeningCostLine({
  state,
  cost,
  className = "",
}: {
  state: GameState;
  cost: ResourceCost;
  className?: string;
}) {
  const parts = resourceCostParts(cost);
  if (parts.length === 0) return null;

  return (
    <span
      className={["map-hex-branch-pad-cost structure-cost-primary", className]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="structure-cost-label">Cost:</span>{" "}
      {parts.map((part, index) => (
        <span key={part.key} className="structure-cost-part">
          {index > 0 ? <span className="structure-cost-sep"> · </span> : null}
          <span
            className={
              canAffordCostPart(state, "hq", part)
                ? "structure-cost-affordable"
                : "structure-cost-unaffordable"
            }
          >
            {part.label} {formatNumber(part.amount)}
          </span>
        </span>
      ))}
    </span>
  );
}

function CommercialLotSection({
  state,
  dispatch,
  coord,
  info,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  coord: AxialCoord;
  info: Extract<ReturnType<typeof mapHexInfo>, { kind: "commercial" }>;
}) {
  const site = commercialSiteAt(coord);
  const [branchOpen, setBranchOpen] = useState(false);
  const [openTipPad, setOpenTipPad] = useState<number | null>(null);
  const [confirmPadIndex, setConfirmPadIndex] = useState<number | null>(null);
  const postings = postingsForCommercialLot(state, info.commercialLotId);
  const activePostingIds = new Set(
    state.jobEngagements
      .filter(
        (engagement) => engagement.commercialLotId === info.commercialLotId,
      )
      .map((engagement) => engagement.postingId),
  );
  const branchSlots = site?.branchSlots ?? [];
  const branchLocked = !branchManagementResearched(state);
  const confirmSlot =
    confirmPadIndex != null ? branchSlots[confirmPadIndex] : null;
  const confirmCost =
    confirmPadIndex != null
      ? branchOpeningCostForPad(info.commercialLotId, confirmPadIndex)
      : null;

  useEffect(() => {
    setBranchOpen(false);
    setOpenTipPad(null);
    setConfirmPadIndex(null);
  }, [coord.q, coord.r]);

  function sendToSecretary(postingId: string) {
    dispatch({ type: "SELECT_TOWER", towerId: null });
    dispatch({
      type: "SET_VIEW",
      view: "office",
      jobFocusPostingId: postingId,
    });
  }

  return (
    <>
      <section className="map-hex-contracts-section" aria-label="Branch">
        <button
          type="button"
          className={`map-hex-contracts-toggle${branchOpen ? " is-open" : ""}`}
          aria-expanded={branchOpen}
          onClick={() => setBranchOpen((open) => !open)}
        >
          <span className="map-hex-contracts-toggle-label">Branch</span>
          <span className="map-hex-contracts-toggle-caret" aria-hidden>
            {branchOpen ? "▾" : "▸"}
          </span>
        </button>

        {branchOpen ? (
          <div className="map-hex-contracts-body">
            {branchLocked ? (
              <p className="map-hex-commercial-lead map-hex-commercial-locked">
                Locked
              </p>
            ) : null}

            <div className="map-hex-commercial-facts">
              <div className="map-hex-commercial-row">
                <span className="map-hex-commercial-label">Site bonus</span>
                <span className="map-hex-commercial-value">
                  +{formatSiteRateBonusPercent(siteRateBonusForRegion(info.region))}{" "}
                  structure passives per branch at this region
                </span>
              </div>
            </div>

            {branchSlots.length > 0 ? (
              <ul className="map-hex-branch-pad-list" aria-label="Branch pads">
                {branchSlots.map((slot, index) => {
                  const established = establishedBranchAtPad(
                    state,
                    info.commercialLotId,
                    index,
                  );
                  const canEstablish =
                    !branchLocked &&
                    !established &&
                    canEstablishBranchPad(state, info.commercialLotId, index);
                  const blockers = branchEstablishBlockersForPad(
                    state,
                    info.commercialLotId,
                    index,
                  );
                  const openingCost = branchOpeningCostForPad(
                    info.commercialLotId,
                    index,
                  );
                  const tipId = `map-hex-branch-pad-tip-${coord.q}-${coord.r}-${index}`;
                  const tipOpen = openTipPad === index;

                  return (
                    <li
                      key={slot.size}
                      className={`map-hex-branch-pad${established ? " is-open" : ""}`}
                    >
                      <div className="map-hex-branch-pad-info">
                        <div className="map-hex-branch-pad-line map-hex-branch-pad-line-title">
                          <span className="map-hex-branch-pad-name">
                            {slot.label}
                          </span>
                          {!established ? (
                            <span className="map-hex-branch-pad-meta">
                              · {slot.officeSpace} space · to {slot.expansionCap}
                            </span>
                          ) : null}
                        </div>
                        {established ? (
                          <p className="map-hex-branch-pad-status muted">
                            Open · {established.name}
                          </p>
                        ) : (
                          <div className="map-hex-branch-pad-line map-hex-branch-pad-line-detail">
                            <BranchOpeningCostLine
                              state={state}
                              cost={openingCost}
                            />
                            <div
                              className={[
                                "map-hex-establish-wrap map-hex-establish-wrap-pad",
                                !canEstablish ? "has-blockers" : "",
                                tipOpen ? "is-tip-open" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              onMouseLeave={() =>
                                setOpenTipPad((current) =>
                                  current === index ? null : current,
                                )
                              }
                            >
                              <button
                                type="button"
                                className={`map-hex-job-send map-hex-branch-establish${
                                  !canEstablish ? " is-blocked" : ""
                                }`}
                                disabled={branchLocked}
                                aria-describedby={
                                  !canEstablish ? tipId : undefined
                                }
                                onMouseEnter={() => {
                                  if (!canEstablish) setOpenTipPad(index);
                                }}
                                onFocus={() => {
                                  if (!canEstablish) setOpenTipPad(index);
                                }}
                                onBlur={() => setOpenTipPad(null)}
                                onClick={() => {
                                  if (branchLocked || !canEstablish) {
                                    if (blockers.length > 0) {
                                      setOpenTipPad(index);
                                    }
                                    return;
                                  }
                                  setConfirmPadIndex(index);
                                }}
                              >
                                Establish
                              </button>
                              {!canEstablish && blockers.length > 0 ? (
                                <div
                                  id={tipId}
                                  className="map-hex-blocker-tip map-hex-blocker-tip-left"
                                  role="tooltip"
                                >
                                  <ul className="map-hex-blocker-tip-list">
                                    {blockers.map((line) => (
                                      <li key={line}>{line}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      {confirmPadIndex != null && confirmSlot && confirmCost ? (
        <ConfirmDialog
          title={`Open ${confirmSlot.label} pad?`}
          message={
            <>
              Pay <BranchOpeningCostLine state={state} cost={confirmCost} /> at
              HQ. Consumes 1 Branch Manager. {confirmSlot.officeSpace} office
              space (expands to {confirmSlot.expansionCap}).
            </>
          }
          confirmLabel="Establish branch"
          cancelLabel="Cancel"
          confirmTone="primary"
          onConfirm={() => {
            dispatch({
              type: "ESTABLISH_BRANCH",
              coord,
              slotIndex: confirmPadIndex,
            });
            setConfirmPadIndex(null);
          }}
          onCancel={() => setConfirmPadIndex(null)}
        />
      ) : null}

      <HexContractsSection
        state={state}
        coord={coord}
        postings={postings}
        isEngaged={(postingId) => activePostingIds.has(postingId)}
        onSend={sendToSecretary}
      />
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
  const distanceLabel = mapHexDistanceLabel(state, coord);

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
            Capital hex. Distance rings start here.
          </p>
        )}

        {info.kind === "office" && (
          <OfficeDrawerSection
            state={state}
            dispatch={dispatch}
            officeId={info.officeId}
          />
        )}

        {info.kind === "tower" && (
          <TowerContractsSection
            state={state}
            dispatch={dispatch}
            towerId={info.towerId}
            coord={coord}
          />
        )}

        {info.kind === "commercial" && (
          <CommercialLotSection
            state={state}
            dispatch={dispatch}
            coord={coord}
            info={info}
          />
        )}

        {info.kind === "terrain" && (
          <p className="map-hex-desc muted">
            Open {REGION_LABELS[info.region].toLowerCase()} hex.
          </p>
        )}
      </div>
    </aside>
  );
}
