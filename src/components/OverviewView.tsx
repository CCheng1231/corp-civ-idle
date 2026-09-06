import { type Dispatch } from "react";
import {
  RESEARCH,
  STRUCTURES,
  WIN_NET_WORTH,
  formatNumber,
  formatResourceShort,
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
import type { GameAction, GameState, OfficeLocationId } from "../game/types";
import { SceneBanner } from "./SceneBanner";
import { TabPortraitLayout } from "./TabPortraitLayout";
import { TabSiteHeader } from "./TabSiteHeader";
import { HubSyncedTabBackground } from "./HubSyncedTabBackground";
import { HubSyncedTabScrollBody } from "./HubSyncedTabScrollBody";
import homeStaffArt from "../assets/Home_Staff.png";
import homeStructureArt from "../assets/Home_Structure.jpg";
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
  );
  const staffTotal = showAll
    ? officeIds.reduce(
        (sum, siteId) => sum + totalWorkforce(rosterAt(state, siteId)),
        0,
      )
    : totalWorkforce(rosterAt(state, officeId));

  const overviewNetWorth = (
    <div className="overview-summary-block">
      <h2 className="overview-panel-title">Overview</h2>
      <p
        className="overview-net-worth-banner"
        aria-label={`Net worth ${formatResourceShort(state.netWorth)} of ${formatResourceShort(WIN_NET_WORTH)} goal`}
      >
        <span className="tab-net-worth-label">Net worth</span>
        <span className="overview-net-worth-amounts">
          <strong className="tab-net-worth-value">
            {formatResourceShort(state.netWorth)}
          </strong>
          <span className="tab-net-worth-goal">
            / {formatResourceShort(WIN_NET_WORTH)}
          </span>
        </span>
      </p>
    </div>
  );

  const overviewBesidePortrait = (
    <>
      <TabSiteHeader homeHubTab="overview" state={state} dispatch={dispatch} />
      <OverviewQueuePanel state={state} dispatch={dispatch} />
    </>
  );

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
            <li key={`${siteId}-${def.id}`}>
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
      {overviewNetWorth}
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
                  {projectedResearch[def.id] > state.researchLevels[def.id] && (
                    <span className="muted">
                      {" "}
                      (+{projectedResearch[def.id] - state.researchLevels[def.id]}{" "}
                      queued)
                    </span>
                  )}
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
            {formatNumber(staffTotal)}
          </p>
        ) : null}
      </section>
    </>
  );

  return (
    <div className="main-view-panel location-view-panel overview-view hub-synced-tab-view">
      <HubSyncedTabBackground chiefId={state.chiefOfStaffId} />
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
          {overviewBesidePortrait}
        </TabPortraitLayout>
        <div className="tab-below-portrait">{overviewBelowPortrait}</div>
      </HubSyncedTabScrollBody>
    </div>
  );
}
