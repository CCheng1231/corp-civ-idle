import {
  forwardRef,
  type Dispatch,
  useEffect,
  useRef,
  useState,
} from "react";
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
} from "../game/constants";
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
  postingsForCommercialLot,
  postingsForTower,
} from "../game/jobs";
import type {
  AxialCoord,
  CommercialLotId,
  CompletionBand,
  GameAction,
  GameState,
  JobPosting,
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
import { axialKey } from "../game/hexLayout";

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
  | { mode: "commercial"; commercialLotId: CommercialLotId };

function MapLandmarkSiteDrawerSection({
  instance,
  coord,
}: {
  instance: MapLandmarkArtInstance;
  coord: AxialCoord;
}) {
  const multi = instance.footprint.length > 1;
  const onAnchor = instance.footprint.some(
    (c) => c.q === coord.q && c.r === coord.r,
  );

  return (
    <>
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
      {multi ? (
        <p className="map-hex-desc muted">
          Part of a multi-hex world landmark
          {onAnchor ? " (primary anchor hex)." : "."}
          {" "}
          Hexes:{" "}
          {instance.footprint.map((c) => axialKey(c)).join(", ")}
        </p>
      ) : (
        <p className="map-hex-desc muted">
          Shared world landmark — same geography for every player.
        </p>
      )}
    </>
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
  coord,
  postings,
  isEngaged,
  onSend,
  highlightPostingId,
}: {
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
                              Dur: {formatJobDurationSec(def.durationSec)} ·{" "}
                              <CompletionBandTip
                                postingId={posting.id}
                                band={band}
                              />{" "}
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
      coord={coord}
      postings={postings}
      isEngaged={(postingId) => activePostingIds.has(postingId)}
      onSend={sendToSecretary}
      highlightPostingId={highlightPostingId}
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
          <MapLandmarkSiteDrawerSection
            instance={landmarkInstance}
            coord={coord}
          />
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

        {info.kind === "major-hub" && (
          <p className="map-hex-desc muted">
            Strategic major hub — regional anchor on the world map (Z1 ring).
          </p>
        )}

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
