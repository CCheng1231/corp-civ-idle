import { useEffect, useState, type Dispatch } from "react";
import {
  secretaryById,
  SECRETARIES,
  type SecretaryDefinition,
} from "../game/secretaryData";
import { secretaryRosterPortraitSrc } from "../game/secretaryAssets";
import {
  secretaryIsAssigned,
  secretaryRosterRoleLines,
  secretariesForOfficeFilter,
  sortSecretariesForRoster,
} from "../game/secretaryRoles";
import type { GameAction, GameState, SecretaryId } from "../game/types";
import { HubSyncedTabBackground } from "./HubSyncedTabBackground";
import { HubSyncedTabScrollBody } from "./HubSyncedTabScrollBody";
import { TabPortraitLayout } from "./TabPortraitLayout";
import { TabSiteHeader } from "./TabSiteHeader";
import { SecretaryDetailDialog } from "./SecretaryDetailDialog";

const SECRETARY_ROSTER_PORTRAIT_SIZE_KEY =
  "corp-civ-idle-secretary-roster-portrait-size";

interface SecretaryRosterViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

type RosterViewMode = "detail" | "grid";

function filterRosterEntries(
  entries: SecretaryDefinition[],
  state: GameState,
  hideUsed: boolean,
): SecretaryDefinition[] {
  if (!hideUsed) return entries;
  return entries.filter((entry) => !secretaryIsAssigned(entry.id, state));
}

export function SecretaryRosterView({
  state,
  dispatch,
}: SecretaryRosterViewProps) {
  const chiefId = state.chiefOfStaffId;
  const chief = secretaryById(chiefId);
  const rosterEntries = sortSecretariesForRoster(SECRETARIES, chiefId);
  const officeFilteredEntries = secretariesForOfficeFilter(
    rosterEntries,
    state.selectedOffice,
  );
  const [detailId, setDetailId] = useState<SecretaryId | null>(null);
  const [rosterViewMode, setRosterViewMode] = useState<RosterViewMode>("detail");
  const [hideUsed, setHideUsed] = useState(false);
  const detailSecretary = detailId ? secretaryById(detailId) : null;
  const visibleEntries = filterRosterEntries(
    officeFilteredEntries,
    state,
    hideUsed,
  );

  useEffect(() => {
    const scrollRoot = document.querySelector(
      ".secretary-roster-view.hub-synced-tab-view .hub-synced-tab-scroll-body",
    );
    if (scrollRoot instanceof HTMLElement) {
      scrollRoot.scrollTop = 0;
    }
  }, []);

  function selectChief(id: SecretaryId) {
    if (id === chiefId) return;
    dispatch({ type: "SELECT_CHIEF_OF_STAFF", secretaryId: id });
  }

  function toggleRosterViewMode() {
    setRosterViewMode((mode) => (mode === "detail" ? "grid" : "detail"));
  }

  const rosterChiefBanner = (
    <section className="secretary-roster-chief-banner" aria-label="Chief of Staff">
      <h2 className="secretary-roster-title">
        Chief of Staff <span aria-hidden="true">—</span> {chief.name}
      </h2>
      <p className="secretary-roster-stat-line">{chief.chiefOfStaffBonus}</p>
    </section>
  );

  const rosterBelowPortrait = (
    <section
      className="secretary-roster-picker secretary-roster-panel"
      aria-label="Secretary roster"
    >
      <header className="secretary-roster-toolbar">
        <h3 className="secretary-roster-toolbar-title">Roster</h3>
        <div className="secretary-roster-toolbar-actions">
          <button
            type="button"
            className="btn linkish secretary-roster-view-toggle"
            aria-pressed={rosterViewMode === "grid"}
            onClick={toggleRosterViewMode}
          >
            {rosterViewMode === "detail" ? "Grid view" : "Detail view"}
          </button>
          <label className="secretary-roster-hide-used progression-hide-completed-check tab-queue-filter">
            <input
              type="checkbox"
              checked={hideUsed}
              onChange={(event) => setHideUsed(event.target.checked)}
            />
            Hide used
          </label>
        </div>
      </header>

      {visibleEntries.length === 0 ? (
        <p className="muted secretary-roster-empty">
          {state.selectedOffice === "all"
            ? "No secretaries to show."
            : "No secretaries posted at this office."}
        </p>
      ) : rosterViewMode === "grid" ? (
        <ul className="secretary-roster-grid">
          {visibleEntries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className="secretary-roster-grid-card"
                aria-label={`View ${entry.name} profile`}
                onClick={() => setDetailId(entry.id)}
              >
                <div className="secretary-roster-grid-thumb">
                  <img
                    src={secretaryRosterPortraitSrc(entry.id)}
                    alt=""
                    aria-hidden
                    draggable={false}
                  />
                </div>
                <span className="secretary-roster-grid-name">{entry.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="secretary-roster-list">
          {visibleEntries.map((entry) => {
            const roleLines = secretaryRosterRoleLines(entry, state);
            const roleSummary = roleLines.map((line) => line.text).join(", ");
            return (
              <li key={entry.id}>
                <div className="secretary-roster-row">
                  <button
                    type="button"
                    className="secretary-roster-row-portrait-btn"
                    aria-label={`View ${entry.name} profile`}
                    onClick={() => setDetailId(entry.id)}
                  >
                    <div className="secretary-roster-row-portrait">
                      <div className="secretary-roster-row-thumb">
                        <img
                          src={secretaryRosterPortraitSrc(entry.id)}
                          alt=""
                          aria-hidden
                          draggable={false}
                        />
                      </div>
                      <span className="secretary-roster-row-name">
                        {entry.name}
                      </span>
                    </div>
                  </button>
                  <div
                    className="secretary-roster-row-detail"
                    aria-label={`${entry.name} — ${roleSummary} — ${entry.chiefOfStaffBonus} — ${entry.teamLeadBonus}`}
                  >
                    <div className="secretary-roster-row-roles">
                      {roleLines.map((line) => (
                        <p
                          key={line.id}
                          className={
                            line.emphasis
                              ? "secretary-roster-row-role secretary-roster-row-role-emphasis"
                              : "secretary-roster-row-role"
                          }
                        >
                          {line.text}
                        </p>
                      ))}
                    </div>
                    <div className="secretary-roster-row-bonus">
                      <div className="secretary-roster-row-bonus-block">
                        <span className="secretary-roster-row-bonus-label">
                          Chief of Staff
                        </span>
                        <span className="secretary-roster-row-bonus-text">
                          {entry.chiefOfStaffBonus}
                        </span>
                      </div>
                      <div className="secretary-roster-row-bonus-block">
                        <span className="secretary-roster-row-bonus-label">
                          Team lead
                        </span>
                        <span className="secretary-roster-row-bonus-text">
                          {entry.teamLeadBonus}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  return (
    <div className="main-view-panel location-view-panel secretary-view hub-synced-tab-view secretary-roster-view">
      <HubSyncedTabBackground chiefId={chiefId} portraitSource="secretary" />
      <HubSyncedTabScrollBody>
        <TabPortraitLayout
          storageKey={SECRETARY_ROSTER_PORTRAIT_SIZE_KEY}
          portraitSpacer
          portraitLayout="stretch"
          parallaxScroll={false}
          portraitLocked={false}
          allowPortraitResize={false}
          className="tab-portrait-fit"
        >
          <TabSiteHeader
            secretaryHubTab="roaster"
            state={state}
            dispatch={dispatch}
          />
        </TabPortraitLayout>
        <div className="hub-synced-tab-portrait-reveal" aria-hidden />
        {rosterChiefBanner}
        <div className="tab-below-portrait">{rosterBelowPortrait}</div>
      </HubSyncedTabScrollBody>

      {detailSecretary ? (
        <SecretaryDetailDialog
          secretary={detailSecretary}
          chiefOfStaffId={chiefId}
          onAssignChief={selectChief}
          onClose={() => setDetailId(null)}
        />
      ) : null}
    </div>
  );
}
