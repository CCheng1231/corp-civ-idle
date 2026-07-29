import { type Dispatch } from "react";
import {
  CONTRACTOR_TYPES,
  CONTRACTOR_TRANSFER_SEC_PER_HEX,
  OFFICE_LABELS,
  contractorTransferDurationMs,
  contractorTransferHexDistance,
  contractorsAvailableAt,
  otherOffice,
  totalWorkforce,
} from "../game/constants";
import { formatTimerRemaining } from "../game/timers";
import { ownedOfficeIds } from "../game/mapWorld";
import type {
  ContractorTypeId,
  GameAction,
  GameState,
  OfficeLocationId,
} from "../game/types";

interface ContractorOfficeRosterProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

function transferLabelSec(state: GameState, from: OfficeLocationId, to: OfficeLocationId): string {
  const hexes = contractorTransferHexDistance(state, from, to);
  const sec = contractorTransferDurationMs(state, from, to) / 1000;
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
    contractorType: ContractorTypeId,
  ) {
    dispatch({
      type: "START_CONTRACTOR_TRANSFER",
      from,
      to,
      contractorType,
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
            Relocating staff takes {CONTRACTOR_TRANSFER_SEC_PER_HEX}s per hex (
            {contractorTransferDurationMs(state, "hq", "branch") / 1000}s
            between sites).
          </>
        ) : (
          <>Open a branch on the regional map to relocate staff between sites.</>
        )}{" "}
        Crew in transit are unavailable until they arrive.
      </p>

      <div className="contractor-roster-grid">
        {offices.map((officeId) => {
          const roster = state.contractorsByLocation[officeId];
          const destination =
            offices.length > 1 ? otherOffice(officeId) : null;
          return (
            <div key={officeId} className="contractor-roster-card">
              <div className="contractor-roster-head">
                <strong>{OFFICE_LABELS[officeId]}</strong>
                <span className="muted">{totalWorkforce(roster)} on site</span>
              </div>
              <ul className="contractor-roster-list">
                {CONTRACTOR_TYPES.map((type) => {
                  const count = roster[type.id];
                  const canSend = contractorsAvailableAt(
                    state,
                    officeId,
                    type.id,
                  );
                  return (
                    <li key={type.id} className="contractor-roster-row">
                      <div className="contractor-roster-info">
                        <span className="contractor-role">{type.role}</span>
                        <span className="contractor-count">×{count}</span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-small"
                        disabled={canSend < 1 || !destination}
                        title={
                          destination
                            ? transferLabelSec(state, officeId, destination)
                            : "Open a branch to transfer staff"
                        }
                        onClick={() => {
                          if (destination) {
                            sendOne(officeId, destination, type.id);
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
            </div>
          );
        })}
      </div>

      {state.contractorTransfers.length > 0 && (
        <div className="contractor-transfers">
          <h4>In transit</h4>
          <ul className="build-queue">
            {state.contractorTransfers.map((transfer) => {
              const typeDef = CONTRACTOR_TYPES.find(
                (t) => t.id === transfer.contractorType,
              );
              const remaining = formatTimerRemaining(
                state,
                transfer.arrivesAt,
                now,
              );
              return (
                <li key={transfer.id}>
                  <span className="queue-role">{transfer.count}×</span>
                  <span className="queue-name">
                    {typeDef?.role ?? transfer.contractorType}:{" "}
                    {OFFICE_LABELS[transfer.from]} →{" "}
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
