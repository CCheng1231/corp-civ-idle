import { type Dispatch, type ReactNode } from "react";
import { allOfficesOptionAvailable } from "../game/officeSelection";
import { overviewOfficeOptions } from "../game/mapWorld";
import type { GameAction, GameState, OfficeSelectionId } from "../game/types";

export type HomeHubTab = "overview" | "operations" | "recruitment" | "research";

export const HOME_HUB_TABS: { id: HomeHubTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "operations", label: "Structure" },
  { id: "recruitment", label: "Recruit" },
  { id: "research", label: "Research" },
];

export type SecretaryHubTab = "roaster" | "job" | "log";

export const SECRETARY_HUB_TABS: { id: SecretaryHubTab; label: string }[] = [
  { id: "roaster", label: "Roaster" },
  { id: "job", label: "Job" },
  { id: "log", label: "Log" },
];

function navigateSecretaryHubTab(
  dispatch: Dispatch<GameAction>,
  tab: SecretaryHubTab,
) {
  if (tab === "job") {
    dispatch({ type: "SET_VIEW", view: "office" });
    return;
  }
  dispatch({ type: "SET_SECRETARY_PANEL", panel: tab });
}

function navigateHomeHubTab(
  dispatch: Dispatch<GameAction>,
  tab: HomeHubTab,
) {
  if (tab === "overview") {
    dispatch({ type: "SET_VIEW", view: "overview" });
    dispatch({ type: "SET_HOME_PANEL", panel: "overview" });
    return;
  }
  dispatch({ type: "SET_VIEW", view: tab });
}

interface TabSiteHeaderProps {
  title?: string;
  homeHubTab?: HomeHubTab;
  secretaryHubTab?: SecretaryHubTab;
  state: GameState;
  dispatch: Dispatch<GameAction>;
  titleExtra?: ReactNode;
}

export function TabSiteHeader({
  title,
  homeHubTab,
  secretaryHubTab,
  state,
  dispatch,
  titleExtra,
}: TabSiteHeaderProps) {
  const officeOptions = overviewOfficeOptions(state);
  const officeId = state.selectedOffice;
  const selectedOption = officeOptions.find(
    (option) => option.id === officeId,
  );

  if (secretaryHubTab) {
    return (
      <header
        className="main-view-header location-view-header tab-hero-header tab-hero-header-hub"
      >
        <span className="location-office-picker-label tab-hub-picker-label">
          Section
        </span>
        <select
          className="location-office-select tab-office-select tab-hub-picker-select"
          value={secretaryHubTab}
          aria-label="Section"
          onChange={(event) =>
            navigateSecretaryHubTab(
              dispatch,
              event.target.value as SecretaryHubTab,
            )
          }
        >
          {SECRETARY_HUB_TABS.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
        <span className="location-office-picker-label tab-hub-picker-label">
          Office
        </span>
        <select
          className="location-office-select tab-office-select tab-hub-picker-select"
          value={officeId}
          aria-label="Office"
          onChange={(event) =>
            dispatch({
              type: "SELECT_OFFICE",
              officeId: event.target.value as OfficeSelectionId,
            })
          }
        >
          {allOfficesOptionAvailable(state) ? (
            <option value="all">All offices</option>
          ) : null}
          {officeOptions.map((option) => (
            <option
              key={option.id}
              value={option.id}
              disabled={!option.available}
            >
              {option.label}
              {!option.available ? " (not open)" : ""}
            </option>
          ))}
        </select>
        {selectedOption?.hint ? (
          <p className="muted location-office-hint tab-hub-picker-hint">
            {selectedOption.hint}
          </p>
        ) : null}
      </header>
    );
  }

  if (homeHubTab) {
    return (
      <header
        className="main-view-header location-view-header tab-hero-header tab-hero-header-hub"
      >
        <span className="location-office-picker-label tab-hub-picker-label">
          Section
        </span>
        <select
          className="location-office-select tab-office-select tab-hub-picker-select"
          value={homeHubTab}
          aria-label="Section"
          onChange={(event) =>
            navigateHomeHubTab(dispatch, event.target.value as HomeHubTab)
          }
        >
          {HOME_HUB_TABS.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
        <span className="location-office-picker-label tab-hub-picker-label">
          Office
        </span>
        <select
          className="location-office-select tab-office-select tab-hub-picker-select"
          value={officeId}
          aria-label="Office"
          onChange={(event) =>
            dispatch({
              type: "SELECT_OFFICE",
              officeId: event.target.value as OfficeSelectionId,
            })
          }
        >
          {allOfficesOptionAvailable(state) ? (
            <option value="all">All offices</option>
          ) : null}
          {officeOptions.map((option) => (
            <option
              key={option.id}
              value={option.id}
              disabled={!option.available}
            >
              {option.label}
              {!option.available ? " (not open)" : ""}
            </option>
          ))}
        </select>
        {selectedOption?.hint ? (
          <p className="muted location-office-hint tab-hub-picker-hint">
            {selectedOption.hint}
          </p>
        ) : null}
      </header>
    );
  }

  return (
    <header className="main-view-header location-view-header tab-hero-header">
      <div
        className={`tab-hero-header-row tab-title-row${titleExtra ? " tab-title-extra-row" : ""}`}
      >
        {title ? <h2>{title}</h2> : null}
        {titleExtra}
      </div>
      <div className="tab-hero-header-row tab-office-row">
        <span className="location-office-picker-label">Office</span>
        <select
          className="location-office-select tab-office-select"
          value={officeId}
          aria-label="Office"
          onChange={(event) =>
            dispatch({
              type: "SELECT_OFFICE",
              officeId: event.target.value as OfficeSelectionId,
            })
          }
        >
          {allOfficesOptionAvailable(state) ? (
            <option value="all">All offices</option>
          ) : null}
          {officeOptions.map((option) => (
            <option
              key={option.id}
              value={option.id}
              disabled={!option.available}
            >
              {option.label}
              {!option.available ? " (not open)" : ""}
            </option>
          ))}
        </select>
      </div>
      {selectedOption?.hint ? (
        <p className="muted location-office-hint">{selectedOption.hint}</p>
      ) : null}
    </header>
  );
}
