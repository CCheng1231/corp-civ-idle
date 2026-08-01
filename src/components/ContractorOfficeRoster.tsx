import { type Dispatch } from "react";
import {
  CONTRACTOR_TRANSFER_SEC_PER_HEX,
  OFFICE_LABELS,
  contractorTransferDurationMs,
  contractorTransferHexDistance,
  otherOffice,
  totalWorkforce,
  unitAvailableAt,
} from "../game/constants";
import { ownedOfficeIds } from "../game/mapWorld";
import { RECRUITMENT_UNITS } from "../game/recruitmentData";
import { unitDefinition } from "../game/unitEffects";
import { formatTimerRemaining } from "../game/timers";
import type {
  GameAction,
  GameState,
  OfficeLocationId,
  UnitId,
} from "../game/types";

interface ContractorOfficeRosterProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

function transferLabelSec(
  state: GameState,
  from: OfficeLocationId,
  to: OfficeLocationId,
  unitId: UnitId,
): string {
  const hexes = contractorTransferHexDistance(state, from, to);
  const sec = contractorTransferDurationMs(state, from, to, unitId, 1) / 1000;
  return `${hexes} hex · ${sec}s (${CONTRACTOR_TRANSFER_SEC_PER_HEX}s/hex)`;
}

export function ContractorOfficeRoster({
  state,
  dispatch,
}: ContractorOfficeRosterProps) {
  const now = Date.now();
  const offices = ownedOfficeIds(state);
  const hqBranchHexes = state.branchEstablished
    ? contractorTransferHexDistance(state, "hq", "branch")
    : 0;

  function sendOne(
    from: OfficeLocationId,
    to: OfficeLocationId,
    unitId: UnitId,
  ) {
    dispatch({
      type: "START_CONTRACTOR_TRANSFER",
      from,
      to,
      unitId,
      count: 1,
    });
  }

  return (
    <section className="contractor-roster-panel">
      <h3>Staff by office</h3>
      <p className="muted">
        {state.branchEstablished ? (
          <>
            HQ and Branch are {hqBranchHexes} hexes apart on the map.
            Relocating staff takes {CONTRACTOR_TRANSFER_SEC_PER_HEX}s per hex.
            Bike Couriers shorten travel by 1 hex each.
          </>
        ) : (
          <>Open a branch on the regional map to relocate staff between sites.</>
        )}{" "}
        Crew in transit or on contracts are unavailable until they return.
      </p>

      <div className="contractor-roster-grid">
        {offices.map((officeId) => {
          const roster = state.contractorsByLocation[officeId];
          const destination =
            offices.length > 1 ? otherOffice(officeId) : null;
          const visibleUnits = RECRUITMENT_UNITS.filter(
            (unit) => (roster[unit.id] ?? 0) > 0,
          );

          return (
            <div key={officeId} className="contractor-roster-card">
              <div className="contractor-roster-head">
                <strong>{OFFICE_LABELS[officeId]}</strong>
                <span className="muted">{totalWorkforce(roster)} on site</span>
              </div>
              {visibleUnits.length === 0 ? (
                <p className="muted">No units stationed here.</p>
              ) : (
                <ul className="contractor-roster-list">
                  {visibleUnits.map((unit) => {
                    const count = roster[unit.id] ?? 0;
                    const canSend = unitAvailableAt(state, officeId, unit.id);
                    return (
                      <li key={unit.id} className="contractor-roster-row">
                        <div className="contractor-roster-info">
                          <span className="contractor-role">{unit.name}</span>
                          <span className="contractor-count">×{count}</span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-small"
                          disabled={canSend < 1 || !destination}
                          title={
                            destination
                              ? transferLabelSec(
                                  state,
                                  officeId,
                                  destination,
                                  unit.id,
                                )
                              : "Open a branch to transfer staff"
                          }
                          onClick={() => {
                            if (destination) {
                              sendOne(officeId, destination, unit.id);
                            }
                          }}
                        >
                          {destination
                            ? `Send 1 → ${OFFICE_LABELS[destination]}`
                            : "No branch yet"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
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
                    {unit.name}: {OFFICE_LABELS[transfer.from]} →{" "}
                    {OFFICE_LABELS[transfer.to]}
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
