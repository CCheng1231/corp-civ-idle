import {
  forwardRef,
  type Dispatch,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  branchEstablishmentInTransitToPad,
  branchEstablishmentStatusLabel,
  branchEstablishmentTravelSummary,
} from "../game/branchEstablishment";
import { axialKey } from "../game/openOffice";
import {
  establishedBranchAtPad,
  isBranchOfficeId,
  branchOfficeIdForPad,
  branchOfficeIdForSite,
} from "../game/branchSites";
import {
  REGION_LABELS,
  branchEstablishBlockersForPad,
  branchManagementResearched,
  branchOpeningCostForPad,
  canEstablishBranchPad,
  commercialLotById,
  commercialSiteAt,
  formatSiteRateBonusPercent,
  isAvailableCommercialLot,
  jobSiteLabelForPosting,
  officeDisplayName,
  siteRateBonusForRegion,
  towerAtCoord,
  siteRateBonusesForState,
} from "../game/mapWorld";
import {
  canAffordCostPart,
  formatNumber,
  resourceCostParts,
  unitAvailableAt,
} from "../game/constants";
import { defaultPlayerBranchName } from "../game/branchNaming";
import { activePlayerId } from "../multiplayer/playerHq";
import {
  formatJobDurationSec,
  formatJobPostingExpiresLabel,
  jobPayoutPerHour,
} from "../game/jobBoard";
import {
  BUSINESS_TYPE_LABELS,
  COMPLETION_BANDS,
  completionBand,
  completionBandLabel,
  JOB_SIZE_LABELS,
  jobDefinitionForPosting,
  jobCompletionSupplyBonus,
  postingsForCommercialLot,
  postingsForMajorHub,
  postingsForTower,
} from "../game/jobs";
import { jobWorkDurationSec } from "../game/secretaryEffects";
import type {
  AxialCoord,
  CommercialLotId,
  CompletionBand,
  GameAction,
  GameState,
  JobPosting,
  MajorHubId,
  OfficeLocationId,
  ResourceCost,
  TowerId,
} from "../game/types";
import { PLAYER_LABELS, type PlayerId } from "../multiplayer/types";
import {
  mapHexDistanceLabel,
  mapHexInfo,
  mapHexKindLabel,
  mapHexTitle,
  type MapHexInfo,
} from "./mapHexInfo";
import type { MapLandmarkArtInstance } from "../game/mapLandmarkInstances";
import { mapLandmarkArtDisplayName } from "../game/mapLandmarkArtRegistry";
interface MapHexDrawerProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  coord: AxialCoord;
  side: "left" | "right";
  onClose: () => void;
  /** From map job filter — open Contracts and highlight this posting */
  highlightPostingId?: string | null;
  /** Canon landmark site covering this hex (player map). */
  landmarkInstance?: MapLandmarkArtInstance | null;
}

type MapContractSite =
  | { mode: "tower"; towerId: TowerId }
  | { mode: "major-hub"; majorHubId: MajorHubId }
  | { mode: "commercial"; commercialLotId: CommercialLotId };

function MapLandmarkSiteDrawerSection({
  instance,
}: {
  instance: MapLandmarkArtInstance;
}) {
  const multi = instance.footprint.length > 1;

  return (
    <dl className="map-hex-facts">
      <div>
        <dt>Site id</dt>
        <dd>{instance.siteId}</dd>
      </div>
      <div>
        <dt>Landmark</dt>
        <dd>{mapLandmarkArtDisplayName(String(instance.artId))}</dd>
      </div>
      {multi ? (
        <div>
          <dt>Footprint</dt>
          <dd>{instance.footprint.length} hexes</dd>
        </div>
      ) : null}
    </dl>
  );
}

function contractSiteForDrawer(
  state: GameState,
  coord: AxialCoord,
  info: MapHexInfo,
  highlightPostingId: string | null,
): MapContractSite | null {
  if (info.kind === "tower") {
    return { mode: "tower", towerId: info.towerId };
  }
  if (info.kind === "major-hub") {
    return { mode: "major-hub", majorHubId: info.hubId as MajorHubId };
  }
  if (info.kind === "commercial") {
    return { mode: "commercial", commercialLotId: info.commercialLotId };
  }

  const towerId = towerAtCoord(coord, state.settings);
  if (towerId) {
    return { mode: "tower", towerId };
  }

  const commercial = commercialSiteAt(coord, state.settings);
  if (commercial) {
    return { mode: "commercial", commercialLotId: commercial.id };
  }

  if (!highlightPostingId) return null;
  const posting = state.jobPostings.find((p) => p.id === highlightPostingId);
  if (!posting) return null;
  try {
    const def = jobDefinitionForPosting(posting);
    const lotId = posting.commercialLotId ?? def.commercialLotId ?? null;
    if (lotId) {
      return { mode: "commercial", commercialLotId: lotId };
    }
    const resolvedTower = posting.towerId ?? def.towerId ?? null;
    if (resolvedTower) {
      return { mode: "tower", towerId: resolvedTower };
    }
    const resolvedHub = posting.majorHubId ?? def.majorHubId ?? null;
    if (resolvedHub) {
      return { mode: "major-hub", majorHubId: resolvedHub };
    }
  } catch {
    return null;
  }
  return null;
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

function PlayerHqDrawerSection({
  state,
  playerId,
}: {
  state: GameState;
  playerId: PlayerId;
}) {
  const presence = state.companyPresence?.[playerId];
  const label = presence?.displayName ?? PLAYER_LABELS[playerId];
  const branchCount = presence?.branchSites?.length ?? 0;

  return (
    <>
      <p className="map-hex-desc">
        {label}&apos;s company headquarters on the shared world map.
      </p>
      {presence ? (
        <dl className="map-hex-facts">
          <div>
            <dt>Branches</dt>
            <dd>{branchCount}</dd>
          </div>
        </dl>
      ) : (
        <p className="map-hex-desc muted">
          No live presence data — offline or not in this world session.
        </p>
      )}
    </>
  );
}

function DevRemoveBranchControl({
  state,
  dispatch,
  officeId,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  officeId: OfficeLocationId;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const site = state.branchSites.find(
    (s) => branchOfficeIdForSite(s) === officeId,
  );
  const label = officeDisplayName(state, officeId);
  const ownerLabel =
    site?.ownerPlayerId != null
      ? (PLAYER_LABELS[site.ownerPlayerId as PlayerId] ?? site.ownerPlayerId)
      : null;

  if (state.settings.mapPresentation !== "dev" || !site) return null;

  return (
    <>
      <div className="map-hex-dev-branch-remove">
        <p className="muted map-hex-dev-branch-remove-hint">
          Dev only — deletes branch state{ownerLabel ? ` (${ownerLabel})` : ""}.
          Staff return to HQ.
        </p>
        <button
          type="button"
          className="btn map-hex-dev-branch-remove-btn"
          onClick={() => setConfirmOpen(true)}
        >
          Remove branch
        </button>
      </div>
      {confirmOpen ? (
        <ConfirmDialog
          title="Remove branch (dev)"
          message={`Remove ${label} from the map and wipe its structures, research, and staff?`}
          confirmLabel="Remove"
          onConfirm={() => {
            dispatch({ type: "DEV_REMOVE_BRANCH", officeId });
            setConfirmOpen(false);
          }}
          onCancel={() => setConfirmOpen(false)}
        />
      ) : null}
    </>
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
      {isBranchOfficeId(officeId) ? (
        <DevRemoveBranchControl
          state={state}
          dispatch={dispatch}
          officeId={officeId}
        />
      ) : null}
    </>
  );
}

function HexContractsSection({
  gameState,
  coord,
  postings,
  isEngaged,
  onSend,
  highlightPostingId,
}: {
  gameState: Pick<GameState, "chiefOfStaffId">;
  coord: AxialCoord;
  postings: JobPosting[];
  isEngaged: (postingId: string) => boolean;
  onSend: (postingId: string) => void;
  highlightPostingId?: string | null;
}) {
  const [contractsOpen, setContractsOpen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const now = Date.now();
  const highlightHere =
    highlightPostingId != null &&
    postings.some((p) => p.id === highlightPostingId);

  useEffect(() => {
    setContractsOpen(highlightHere);
  }, [coord.q, coord.r, highlightHere, highlightPostingId]);

  useEffect(() => {
    if (!highlightHere || !contractsOpen || !highlightPostingId) return;
    const row = listRef.current?.querySelector(
      `[data-map-hex-job-id="${highlightPostingId}"]`,
    );
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlightHere, contractsOpen, highlightPostingId, coord.q, coord.r]);

  if (postings.length === 0) {
    return null;
  }

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
          <ul className="map-hex-job-list" ref={listRef}>
            {postings.map((posting) => {
                  const def = jobDefinitionForPosting(posting);
                  const engaged = isEngaged(posting.id);
                  const selected = posting.id === highlightPostingId;
                  const band = completionBand(
                    posting.unitHoursCompleted,
                    def.unitHoursTotal,
                  );
                  return (
                    <li
                      key={posting.id}
                      data-map-hex-job-id={posting.id}
                      className={`map-hex-job-row${
                        selected ? " map-hex-job-row-active" : ""
                      }${engaged ? " map-hex-job-row-engaged" : ""}`}
                    >
                      <div className="map-hex-job-info">
                        <div className="map-hex-job-line map-hex-job-line-title">
                          <span className="map-hex-job-title">
                            {def.title}
                            <span className="map-hex-job-expires-hr">
                              ·{" "}
                              {formatJobPostingExpiresLabel(
                                posting.expiresAt,
                                now,
                                { titleLength: def.title.length },
                              )}
                            </span>
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
                              Dur:{" "}
                              {formatJobDurationSec(
                                jobWorkDurationSec(gameState, def.durationSec),
                              )}{" "}
                              ·{" "}
                              <CompletionBandTip
                                postingId={posting.id}
                                band={band}
                              />{" "}
                              · ${formatNumber(jobPayoutPerHour(posting))}/hr
                            </span>
                            {jobCompletionSupplyBonus(def) > 0 ? (
                              <span className="map-hex-job-supply-on-complete">
                                {formatNumber(jobCompletionSupplyBonus(def))} SUP by
                                completion
                              </span>
                            ) : null}
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
        </div>
      ) : null}
    </section>
  );
}

function MajorHubContractsSection({
  state,
  dispatch,
  majorHubId,
  coord,
  highlightPostingId,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  majorHubId: MajorHubId;
  coord: AxialCoord;
  highlightPostingId?: string | null;
}) {
  const postings = postingsForMajorHub(state, majorHubId);
  const activePostingIds = new Set(
    state.jobEngagements
      .filter((engagement) => engagement.majorHubId === majorHubId)
      .map((engagement) => engagement.postingId),
  );

  function sendToSecretary(postingId: string) {
    dispatch({
      type: "SET_VIEW",
      view: "office",
      jobFocusPostingId: postingId,
    });
  }

  return (
    <HexContractsSection
      gameState={state}
      coord={coord}
      postings={postings}
      isEngaged={(postingId) => activePostingIds.has(postingId)}
      onSend={sendToSecretary}
      highlightPostingId={highlightPostingId}
    />
  );
}

function TowerContractsSection({
  state,
  dispatch,
  towerId,
  coord,
  highlightPostingId,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  towerId: TowerId;
  coord: AxialCoord;
  highlightPostingId?: string | null;
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
      gameState={state}
      coord={coord}
      postings={postings}
      isEngaged={(postingId) => activePostingIds.has(postingId)}
      onSend={sendToSecretary}
      highlightPostingId={highlightPostingId}
    />
  );
}

/** Full-screen dim for map modals — outside hex drawer so overflow does not clip it. */
function mapModalPortalRoot(): HTMLElement {
  if (typeof document === "undefined") {
    return null as unknown as HTMLElement;
  }
  return (
    document.querySelector(".device-preview-webview") ??
    document.getElementById("root") ??
    document.body
  );
}

function BranchOpeningCostLine({
  state,
  cost,
  fromOfficeId = "hq",
  className = "",
  showLabel = true,
}: {
  state: GameState;
  cost: ResourceCost;
  fromOfficeId?: OfficeLocationId;
  className?: string;
  showLabel?: boolean;
}) {
  const parts = resourceCostParts(cost);
  const hasBm = unitAvailableAt(state, fromOfficeId, "branch_manager") >= 1;

  return (
    <span
      className={["map-hex-branch-pad-cost structure-cost-primary", className]
        .filter(Boolean)
        .join(" ")}
    >
      {showLabel ? (
        <>
          <span className="structure-cost-label map-hex-branch-cost-word">
            Cost
          </span>
          <span className="structure-cost-sep map-hex-branch-cost-sep"> · </span>
        </>
      ) : null}
      {parts.map((part, index) => (
        <span key={part.key} className="structure-cost-part">
          {index > 0 ? <span className="structure-cost-sep"> · </span> : null}
          <span
            className={
              canAffordCostPart(state, fromOfficeId, part)
                ? "structure-cost-affordable"
                : "structure-cost-unaffordable"
            }
          >
            {part.label} {formatNumber(part.amount)}
          </span>
        </span>
      ))}
      {parts.length > 0 ? (
        <span className="structure-cost-sep"> · </span>
      ) : null}
      <span
        className={
          hasBm
            ? "structure-cost-affordable"
            : "structure-cost-unaffordable"
        }
      >
        1 Branch Manager
      </span>
    </span>
  );
}

function CommercialLotSection({
  state,
  dispatch,
  coord,
  info,
  highlightPostingId,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  coord: AxialCoord;
  info: Extract<ReturnType<typeof mapHexInfo>, { kind: "commercial" }>;
  highlightPostingId?: string | null;
}) {
  const site = commercialSiteAt(coord);
  const [branchOpen, setBranchOpen] = useState(false);
  const [openTipPad, setOpenTipPad] = useState<number | null>(null);
  const [confirmPadIndex, setConfirmPadIndex] = useState<number | null>(null);
  const [confirmBranchName, setConfirmBranchName] = useState("");
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
  const confirmTravel =
    confirmPadIndex != null
      ? branchEstablishmentTravelSummary(state, "hq", coord)
      : null;
  const defaultEstablishBranchName = defaultPlayerBranchName(
    activePlayerId(state),
    state.worldBranchNameSeq,
  );
  const mapNow = state.lastTickAt || Date.now();

  useEffect(() => {
    if (confirmPadIndex != null) {
      setConfirmBranchName(
        defaultPlayerBranchName(
          activePlayerId(state),
          state.worldBranchNameSeq,
        ),
      );
    }
  }, [confirmPadIndex, state.worldBranchNameSeq, state.onlineSession]);

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
                  const padHexKey = axialKey(coord);
                  const enRoute = branchEstablishmentInTransitToPad(
                    state,
                    padHexKey,
                    index,
                  );
                  const established = establishedBranchAtPad(
                    state,
                    info.commercialLotId,
                    index,
                  );
                  const canEstablish =
                    !branchLocked &&
                    !established &&
                    !enRoute &&
                    canEstablishBranchPad(state, info.commercialLotId, index, coord);
                  const blockers = branchEstablishBlockersForPad(
                    state,
                    info.commercialLotId,
                    index,
                    coord,
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
                      className={`map-hex-branch-pad${established || enRoute ? " is-open" : ""}`}
                    >
                      <div className="map-hex-branch-pad-info">
                        <div className="map-hex-branch-pad-line map-hex-branch-pad-line-title">
                          <span className="map-hex-branch-pad-name">
                            {slot.label}
                          </span>
                          {!established ? (
                            <span className="map-hex-branch-pad-meta">
                              · {slot.officeSpace} space → {slot.expansionCap}
                            </span>
                          ) : null}
                        </div>
                        {enRoute ? (
                          <p className="map-hex-branch-pad-status muted">
                            Branch Manager en route ·{" "}
                            {branchEstablishmentStatusLabel(
                              state,
                              enRoute,
                              mapNow,
                            )}
                          </p>
                        ) : established ? (
                          <>
                            <p className="map-hex-branch-pad-status muted">
                              Open · {established.name}
                            </p>
                            {state.settings.mapPresentation === "dev" ? (
                              <DevRemoveBranchControl
                                state={state}
                                dispatch={dispatch}
                                officeId={branchOfficeIdForPad(
                                  info.commercialLotId,
                                  index,
                                )}
                              />
                            ) : null}
                          </>
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

      {confirmPadIndex != null && confirmSlot && confirmCost
        ? createPortal(
            <ConfirmDialog
              dialogClassName="confirm-dialog-establish-branch"
              backdropClassName="map-establish-confirm-backdrop"
              title="Establish New branch"
              message={
                <div className="confirm-dialog-establish-branch-body">
                  <div className="map-hex-commercial-facts confirm-dialog-establish-facts">
                    <div className="map-hex-commercial-row">
                      <span className="map-hex-commercial-label">Pad</span>
                      <span className="map-hex-commercial-value">
                        {confirmSlot.label} · {confirmSlot.officeSpace} space →{" "}
                        {confirmSlot.expansionCap}
                      </span>
                    </div>
                    <div className="map-hex-commercial-row">
                      <span className="map-hex-commercial-label">Cost</span>
                      <span className="map-hex-commercial-value map-hex-commercial-value-cost">
                        <BranchOpeningCostLine
                          state={state}
                          cost={confirmCost}
                          showLabel={false}
                        />
                      </span>
                    </div>
                    <div className="map-hex-commercial-row">
                      <span className="map-hex-commercial-label">
                        Branch Manager
                      </span>
                      <span className="map-hex-commercial-value">
                        Consumed when the branch opens
                      </span>
                    </div>
                    {confirmTravel ? (
                      <div className="map-hex-commercial-row confirm-dialog-establish-travel-row">
                        <span className="map-hex-commercial-label">Travel</span>
                        <span className="map-hex-commercial-value muted confirm-dialog-establish-travel-value">
                          {confirmTravel.durationLabel} · {confirmTravel.hexes}{" "}
                          Hx
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <label className="branch-rename-field confirm-dialog-establish-name">
                    Branch name
                    <input
                      type="text"
                      maxLength={48}
                      value={confirmBranchName}
                      onChange={(e) => setConfirmBranchName(e.target.value)}
                      placeholder={defaultEstablishBranchName}
                    />
                  </label>
                </div>
              }
              confirmLabel="Send Branch Manager"
              cancelLabel="Back"
              confirmTone="primary"
              onConfirm={() => {
                const name =
                  confirmBranchName.trim() || defaultEstablishBranchName;
                dispatch({
                  type: "ESTABLISH_BRANCH",
                  coord,
                  slotIndex: confirmPadIndex,
                  branchName: name,
                });
                setConfirmPadIndex(null);
              }}
              onCancel={() => setConfirmPadIndex(null)}
            />,
            mapModalPortalRoot(),
          )
        : null}

      <HexContractsSection
        gameState={state}
        coord={coord}
        postings={postings}
        isEngaged={(postingId) => activePostingIds.has(postingId)}
        onSend={sendToSecretary}
        highlightPostingId={highlightPostingId}
      />
    </>
  );
}

export const MapHexDrawer = forwardRef<HTMLElement, MapHexDrawerProps>(
  function MapHexDrawer(
    {
      state,
      dispatch,
      coord,
      side,
      onClose,
      highlightPostingId = null,
      landmarkInstance = null,
    },
    ref,
  ) {
  const info = mapHexInfo(coord, state);
  const contractSite = contractSiteForDrawer(
    state,
    coord,
    info,
    highlightPostingId,
  );
  const defaultTitle = mapHexTitle(info, state);
  const defaultKind = mapHexKindLabel(info);
  const distanceLabel = mapHexDistanceLabel(state, coord);

  let displayTitle = defaultTitle;
  let displayKind = defaultKind;
  let kindIsJobTitle = false;

  if (highlightPostingId) {
    const posting = state.jobPostings.find((p) => p.id === highlightPostingId);
    if (posting) {
      try {
        const def = jobDefinitionForPosting(posting);
        displayTitle = jobSiteLabelForPosting(posting, def);
        displayKind = def.title;
        kindIsJobTitle = true;
      } catch {
        /* keep hex defaults */
      }
    }
  }

  let commercialInfo: Extract<MapHexInfo, { kind: "commercial" }> | null =
    info.kind === "commercial" ? info : null;
  if (!commercialInfo && contractSite?.mode === "commercial") {
    const site = commercialSiteAt(coord, state.settings);
    if (site) {
      commercialInfo = {
        kind: "commercial",
        coord,
        commercialLotId: site.id,
        label: site.label,
        region: site.region,
        available: isAvailableCommercialLot(coord, state),
      };
    } else {
      const lot = commercialLotById(contractSite.commercialLotId);
      commercialInfo = {
        kind: "commercial",
        coord,
        commercialLotId: lot.id,
        label: lot.label,
        region: lot.region,
        available: isAvailableCommercialLot(coord, state),
      };
    }
  }

  return (
    <aside
      ref={ref}
      className={`map-hex-drawer is-open map-hex-drawer-side-${side}`}
      aria-label="Map location details"
    >
      <header className="map-hex-drawer-head">
        <div className="map-hex-drawer-head-text">
          <span
            className={`map-hex-drawer-kind${
              kindIsJobTitle ? " map-hex-drawer-kind-posting" : ""
            }`}
          >
            {displayKind}
          </span>
          <h3 className="map-hex-drawer-title">{displayTitle}</h3>
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
        <div className="map-hex-facts map-hex-facts-compact">
          <span
            className={`map-hex-region-pill map-hex-region-pill-${info.region}`}
            title={REGION_LABELS[info.region]}
          >
            {REGION_LABELS[info.region]}
          </span>
          <span className="map-hex-distance-pill" title="Distance from main office">
            {distanceLabel}
          </span>
        </div>

        {info.kind === "gov" && (
          <p className="map-hex-desc muted">
            Capital hex. Distance rings start here.
          </p>
        )}

        {landmarkInstance ? (
          <MapLandmarkSiteDrawerSection instance={landmarkInstance} />
        ) : null}

        {info.kind === "office" && (
          <OfficeDrawerSection
            state={state}
            dispatch={dispatch}
            officeId={info.officeId}
          />
        )}

        {contractSite?.mode === "tower" ? (
          <TowerContractsSection
            state={state}
            dispatch={dispatch}
            towerId={contractSite.towerId}
            coord={coord}
            highlightPostingId={highlightPostingId}
          />
        ) : null}

        {contractSite?.mode === "major-hub" ? (
          <MajorHubContractsSection
            state={state}
            dispatch={dispatch}
            majorHubId={contractSite.majorHubId}
            coord={coord}
            highlightPostingId={highlightPostingId}
          />
        ) : null}

        {info.kind === "player-hq" && (
          <PlayerHqDrawerSection state={state} playerId={info.playerId} />
        )}

        {commercialInfo ? (
          <CommercialLotSection
            state={state}
            dispatch={dispatch}
            coord={coord}
            info={commercialInfo}
            highlightPostingId={highlightPostingId}
          />
        ) : null}

        {info.kind === "terrain" && !contractSite ? (
          <p className="map-hex-desc muted">
            Open {REGION_LABELS[info.region].toLowerCase()} hex.
          </p>
        ) : null}
      </div>
    </aside>
  );
},
);
