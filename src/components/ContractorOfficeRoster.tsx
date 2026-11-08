import { useState, type Dispatch } from "react";
import {
  CONTRACTOR_TRANSFER_SEC_PER_HEX,
  canAffordAtOffice,
  contractorTransferDurationMs,
  contractorTransferHexDistance,
  contractorTransferSupplyCost,
  formatInteger,
  officeSiteLabel,
  otherOffice,
  rosterAt,
  totalWorkforce,
  unitAvailableAt,
} from "../game/constants";
import {
  branchOfficeIds,
  hasBranchOffices,
  ownedOfficeIds,
} from "../game/branchSites";
import { RECRUITMENT_UNITS } from "../game/recruitmentData";
import { totalAssigned, unitDefinition } from "../game/unitEffects";
import { formatTimerRemaining } from "../game/timers";
import type {
  GameAction,
  GameState,
  OfficeLocationId,
  UnitAssignment,
  UnitId,
} from "../game/types";
import { UnitCountPicker } from "./UnitCountPicker";

interface ContractorOfficeRosterProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

function transferSupplyTotal(
  state: GameState,
  from: OfficeLocationId,
  to: OfficeLocationId,
  draft: UnitAssignment,
): number {
  let supply = 0;
  for (const [unitId, count] of Object.entries(draft)) {
    const n = count ?? 0;
    if (n <= 0) continue;
    supply += contractorTransferSupplyCost(
      state,
      from,
      to,
      unitId as UnitId,
      n,
    );
  }
  return supply;
}

function transferBlockReason(
  state: GameState,
  from: OfficeLocationId,
  to: OfficeLocationId | null,
  draft: UnitAssignment,
): string | null {
  if (!to) return "Open a branch to relocate staff";
  const total = totalAssigned(draft);
  if (total <= 0) return "Choose units to send";
  for (const [unitId, count] of Object.entries(draft)) {
    const n = count ?? 0;
    if (n <= 0) continue;
    if (unitAvailableAt(state, from, unitId as UnitId) < n) {
      const unit = unitDefinition(unitId as UnitId);
      return `Not enough ${unit.name} on site`;
    }
  }
  const supply = transferSupplyTotal(state, from, to, draft);
  if (
    supply > 0 &&
    !canAffordAtOffice(state, from, { supply })
  ) {
    return `Need ${formatInteger(supply)} supply at ${officeSiteLabel(state, from)}`;
  }
  return null;
}

function transferDestinations(
  offices: OfficeLocationId[],
  from: OfficeLocationId,
): OfficeLocationId[] {
  return offices.filter((id) => id !== from);
}

function defaultTransferDestination(
  state: GameState,
  from: OfficeLocationId,
  offices: OfficeLocationId[],
): OfficeLocationId | null {
  const options = transferDestinations(offices, from);
  if (options.length === 0) return null;
  const cyclic = otherOffice(state, from);
  return options.includes(cyclic) ? cyclic : options[0];
}

function resolveTransferDestination(
  state: GameState,
  from: OfficeLocationId,
  offices: OfficeLocationId[],
  destinationByOffice: Partial<Record<OfficeLocationId, OfficeLocationId>>,
): OfficeLocationId | null {
  const options = transferDestinations(offices, from);
  if (options.length === 0) return null;
  const picked = destinationByOffice[from];
  if (picked && picked !== from && options.includes(picked)) return picked;
  return defaultTransferDestination(state, from, offices);
}

function transferSummaryLabel(
  state: GameState,
  from: OfficeLocationId,
  to: OfficeLocationId,
  draft: UnitAssignment,
): string {
  const total = totalAssigned(draft);
  const supply = transferSupplyTotal(state, from, to, draft);
  const hexes = contractorTransferHexDistance(state, from, to);
  const maxSec = RECRUITMENT_UNITS.reduce((peak, unit) => {
    const count = draft[unit.id] ?? 0;
    if (count <= 0) return peak;
    const sec =
      contractorTransferDurationMs(state, from, to, unit.id, count) / 1000;
    return Math.max(peak, sec);
  }, 0);
  return `${total} unit${total === 1 ? "" : "s"} · ${hexes} hex · ~${Math.ceil(maxSec)}s · ${supply} supply`;
}

export function ContractorOfficeRoster({
  state,
  dispatch,
}: ContractorOfficeRosterProps) {
  const now = Date.now();
  const offices = ownedOfficeIds(state);
  const firstBranchId = branchOfficeIds(state)[0];
  const hqBranchHexes =
    firstBranchId != null
      ? contractorTransferHexDistance(state, "hq", firstBranchId)
      : 0;
  const [draftByOffice, setDraftByOffice] = useState<
    Partial<Record<OfficeLocationId, UnitAssignment>>
  >({});
  const [destinationByOffice, setDestinationByOffice] = useState<
    Partial<Record<OfficeLocationId, OfficeLocationId>>
  >({});

  function draftAt(officeId: OfficeLocationId): UnitAssignment {
    return draftByOffice[officeId] ?? {};
  }

  function setDraftAt(officeId: OfficeLocationId, next: UnitAssignment) {
    setDraftByOffice((prev) => ({ ...prev, [officeId]: next }));
  }

  function openRecruitment(unitId: UnitId) {
    dispatch({
      type: "SET_VIEW",
      view: "recruitment",
      recruitFocusUnitId: unitId,
    });
  }

  function confirmTransfer(from: OfficeLocationId, to: OfficeLocationId) {
    const draft = draftAt(from);
    const blockReason = transferBlockReason(state, from, to, draft);
    if (blockReason) return;
    for (const [unitId, count] of Object.entries(draft)) {
      const n = count ?? 0;
      if (n <= 0) continue;
      dispatch({
        type: "START_CONTRACTOR_TRANSFER",
        from,
        to,
        unitId: unitId as UnitId,
        count: n,
      });
    }
    setDraftAt(from, {});
  }

  return (
    <section className="contractor-roster-panel">
      <h3>Staff by office</h3>
      <p className="muted">
        {hasBranchOffices(state) ? (
          <>
            HQ and Branch are {hqBranchHexes} hexes apart on the map.
            Relocating staff costs {CONTRACTOR_TRANSFER_SEC_PER_HEX}s and 1
            supply per hex per unit.
          </>
        ) : (
          <>Open a branch on the regional map to relocate staff between sites.</>
        )}{" "}
        Crew in transit or on contracts are unavailable until they return.
      </p>

      <div className="contractor-roster-grid">
        {offices.map((officeId) => {
          const roster = rosterAt(state, officeId);
          const destOptions = transferDestinations(offices, officeId);
          const destination = resolveTransferDestination(
            state,
            officeId,
            offices,
            destinationByOffice,
          );
          const draft = draftAt(officeId);
          const blockReason = transferBlockReason(
            state,
            officeId,
            destination,
            draft,
          );
          const disabled = Boolean(blockReason);
          const relocateLabel = destination
            ? `Relocate → ${officeSiteLabel(state, destination)}`
            : "Relocate";

          return (
            <div key={officeId} className="contractor-roster-card">
              <div className="contractor-roster-head">
                <strong>{officeSiteLabel(state, officeId)}</strong>
                <span className="muted">{totalWorkforce(roster)} on site</span>
              </div>
              {destOptions.length > 1 && destination ? (
                <label className="contractor-roster-destination-picker">
                  <span className="contractor-roster-destination-label">
                    Destination
                  </span>
                  <select
                    className="location-office-select contractor-roster-destination-select"
                    value={destination}
                    aria-label={`Destination from ${officeSiteLabel(state, officeId)}`}
                    onChange={(event) =>
                      setDestinationByOffice((prev) => ({
                        ...prev,
                        [officeId]: event.target.value as OfficeLocationId,
                      }))
                    }
                  >
                    {destOptions.map((destId) => (
                      <option key={destId} value={destId}>
                        {officeSiteLabel(state, destId)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : destination ? (
                <p className="muted contractor-roster-destination">
                  Destination: {officeSiteLabel(state, destination)}
                </p>
              ) : null}
              {RECRUITMENT_UNITS.some(
                (unit) => unitAvailableAt(state, officeId, unit.id) > 0,
              ) ? (
                <UnitCountPicker
                  units={RECRUITMENT_UNITS.filter(
                    (unit) => unitAvailableAt(state, officeId, unit.id) > 0,
                  )}
                  maxForUnit={(unitId) =>
                    unitAvailableAt(state, officeId, unitId)
                  }
                  assignment={draft}
                  disabled={!destination}
                  onChange={(next) => setDraftAt(officeId, next)}
                  onRecruitClick={openRecruitment}
                />
              ) : (
                <p className="muted">No units stationed here.</p>
              )}
              <div className="job-posting-engage contractor-roster-engage">
                <button
                  type="button"
                  className="btn primary job-posting-engage-btn"
                  disabled={disabled}
                  title={
                    destination
                      ? transferSummaryLabel(state, officeId, destination, draft)
                      : undefined
                  }
                  onClick={() => {
                    if (destination && !blockReason) {
                      confirmTransfer(officeId, destination);
                    }
                  }}
                >
                  {blockReason ??
                    (() => {
                      const n = totalAssigned(draft);
                      if (n > 0 && destination) {
                        return `${relocateLabel} · ${n} unit${n === 1 ? "" : "s"}`;
                      }
                      return relocateLabel;
                    })()}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {state.contractorTransfers.length > 0 && (
        <div className="contractor-transfers">
          <h4>In transit</h4>
          <ul className="build-queue">
            {state.contractorTransfers.map((transfer) => {
              const unit = unitDefinition(transfer.unitId);
              const remaining = formatTimerRemaining(
                state,
                transfer.arrivesAt,
                now,
              );
              return (
                <li key={transfer.id}>
                  <span className="queue-role">{transfer.count}×</span>
                  <span className="queue-name">
                    {unit.name}: {officeSiteLabel(state, transfer.from)} →{" "}
                    {officeSiteLabel(state, transfer.to)}
                  </span>
                  <span className="queue-status">{remaining}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
