import { type Dispatch } from "react";
import {
  RESEARCH,
  STRUCTURES,
  formatInteger,
  isResearchQueued,
  projectedResearchLevels,
  rosterAt,
  totalWorkforce,
} from "../game/constants";
import { officeDisplayName, ownedOfficeIds } from "../game/mapWorld";
import {
  isAllOfficesSelected,
  resolveOfficeLocation,
} from "../game/officeSelection";
import { RECRUITMENT_UNITS } from "../game/recruitmentData";
import type { GameAction, GameState, OfficeLocationId, StructureId } from "../game/types";
import { SceneBanner } from "./SceneBanner";
import { TabPortraitLayout } from "./TabPortraitLayout";
import { ProgressionTabStickyChrome } from "./ProgressionTabStickyChrome";
import { HubSyncedTabBackground } from "./HubSyncedTabBackground";
import { HubSyncedTabScrollBody } from "./HubSyncedTabScrollBody";
import homeStaffArt from "../assets/Home_Staff.png";
import homeStructureArt from "../assets/Home_Structure.jpg";
import { ContractorOfficeRoster } from "./ContractorOfficeRoster";
import { OverviewNetWorthSummary } from "./OverviewNetWorthSummary";
import { OverviewQueuePanel } from "./OverviewQueuePanel";

interface OverviewViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function OverviewView({ state, dispatch }: OverviewViewProps) {
  const showAll = isAllOfficesSelected(state.selectedOffice);
  const officeId: OfficeLocationId = resolveOfficeLocation(state);
  const officeIds = ownedOfficeIds(state);
  const officeLabel = showAll
    ? "All offices"
    : officeDisplayName(state, officeId);
  const projectedResearch = projectedResearchLevels(state);
  const researchActive = RESEARCH.filter(
    (def) => projectedResearch[def.id] > 0,
  ).filter((def) => !isResearchQueued(state, def.id));
  const staffTotal = showAll
    ? officeIds.reduce(
        (sum, siteId) => sum + totalWorkforce(rosterAt(state, siteId)),
        0,
      )
    : totalWorkforce(rosterAt(state, officeId));

  function openStructureFromOverview(
    siteId: OfficeLocationId,
    structureId: StructureId,
  ) {
    dispatch({ type: "SELECT_OFFICE", officeId: siteId });
    dispatch({
      type: "SET_VIEW",
      view: "operations",
      structureFocusStructureId: structureId,
    });
  }

  function renderStructureLevels(siteId: OfficeLocationId, siteLabel: string) {
    const structures = state.structureLevelsByLocation[siteId];
    const built = STRUCTURES.filter((def) => structures[def.id] > 0);
    if (built.length === 0) {
      return (
        <p key={siteId} className="muted overview-empty-note">
          {siteLabel}: no structures built yet.
        </p>
      );
    }
    return (
      <ul key={siteId} className="overview-research-list">
        {built.map((def) => {
          const level = structures[def.id];
          return (
            <li
              key={`${siteId}-${def.id}`}
              className="overview-structure-row"
              title="Double-click to open Structure"
              onDoubleClick={() => openStructureFromOverview(siteId, def.id)}
            >
              <span>
                {showAll ? `${siteLabel} · ` : ""}
                {def.name}
              </span>
              <strong>
                Lv {level}/{def.maxLevel}
              </strong>
            </li>
          );
        })}
      </ul>
    );
  }

  function renderStaff(siteId: OfficeLocationId, siteLabel: string) {
    const roster = rosterAt(state, siteId);
    const units = RECRUITMENT_UNITS.filter((unit) => (roster[unit.id] ?? 0) > 0);
    if (units.length === 0) {
      return (
        <p key={siteId} className="muted overview-empty-note">
          {showAll ? `${siteLabel}: no units.` : "No units."}
        </p>
      );
    }
    return (
      <ul key={siteId} className="office-site-staff-list">
        {units.map((unit) => (
          <li key={`${siteId}-${unit.id}`}>
            <span className="office-site-staff-role">
              {showAll ? `${siteLabel} · ` : ""}
              {unit.name}
            </span>
            <span className="office-site-staff-count">×{roster[unit.id] ?? 0}</span>
          </li>
        ))}
      </ul>
    );
  }

  const overviewBelowPortrait = (
    <>
      <OverviewNetWorthSummary state={state} />
      <OverviewQueuePanel
        state={state}
        dispatch={dispatch}
        className="overview-below-queues"
      />
      <section className="overview-section location-view-section">
        <h3>Structure levels{showAll ? "" : ` — ${officeLabel}`}</h3>
        <SceneBanner
          src={homeStructureArt}
          storageKey="corp-civ-idle-overview-structure-art-pan"
        />
        {showAll
          ? officeIds.map((siteId) =>
              renderStructureLevels(
                siteId,
                officeDisplayName(state, siteId),
              ),
            )
          : renderStructureLevels(officeId, officeLabel)}
      </section>

      {researchActive.length > 0 && (
        <section className="overview-section location-view-section">
          <h3>Firm-wide research</h3>
          <ul className="overview-research-list">
            {researchActive.map((def) => (
              <li key={def.id}>
                <span>{def.name}</span>
                <strong>
                  Lv {state.researchLevels[def.id]}/{def.maxLevel}
                </strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="overview-section location-view-section overview-staff-section">
        <h3>Staff{showAll ? "" : ` — ${officeLabel}`}</h3>
        <SceneBanner
          src={homeStaffArt}
          storageKey="corp-civ-idle-overview-staff-art-pan"
        />
        {showAll
          ? officeIds.map((siteId) =>
              renderStaff(siteId, officeDisplayName(state, siteId)),
            )
          : renderStaff(officeId, officeLabel)}
        {staffTotal > 0 ? (
          <p className="muted overview-staff-total">
            {showAll ? "Firm total: " : "Total on site: "}
            {formatInteger(staffTotal)}
          </p>
        ) : null}
      </section>

      <section className="overview-section location-view-section overview-staff-relocate-section">
        <ContractorOfficeRoster state={state} dispatch={dispatch} />
      </section>
    </>
  );

  return (
    <div className="main-view-panel location-view-panel overview-view hub-synced-tab-view hub-synced-tab-view--progression-freeze">
      <HubSyncedTabBackground chiefId={state.chiefOfStaffId} />
      <div className="progression-tab-frozen-header">
        <ProgressionTabStickyChrome homeHubTab="overview" state={state} dispatch={dispatch} />
      </div>
      <HubSyncedTabScrollBody>
        <TabPortraitLayout
          storageKey="corp-civ-idle-overview-portrait-size"
          portraitSpacer
          portraitLayout="stretch"
          parallaxScroll={false}
          portraitLocked={false}
          allowPortraitResize={false}
          className="tab-portrait-fit"
        >
          {null}
        </TabPortraitLayout>
        <div className="tab-below-portrait">{overviewBelowPortrait}</div>
      </HubSyncedTabScrollBody>
    </div>
  );
}
