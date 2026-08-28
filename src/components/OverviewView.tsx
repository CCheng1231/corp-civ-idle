import { type Dispatch } from "react";
import {
  MAX_RESEARCH_QUEUE,
  MAX_RECRUIT_QUEUE,
  MAX_STRUCTURE_QUEUE,
  RESEARCH,
  STRUCTURES,
  WIN_NET_WORTH,
  formatNumber,
  formatResourceShort,
  projectedResearchLevels,
  recruitmentJobsAtOffice,
  researchJobsAtOffice,
  rosterAt,
  totalWorkforce,
} from "../game/constants";
import { officeDisplayName, ownedOfficeIds } from "../game/mapWorld";
import {
  isAllOfficesSelected,
  recruitmentJobsForOffices,
  researchJobsForOffices,
  resolveOfficeLocation,
  structureJobsForOffices,
} from "../game/officeSelection";
import { RECRUITMENT_UNITS } from "../game/recruitmentData";
import type { GameAction, GameState, OfficeLocationId } from "../game/types";
import { TabPortraitLayout } from "./TabPortraitLayout";
import { TabSiteHeader } from "./TabSiteHeader";
import { tabQuote } from "../game/tabQuotes";
import homePortrait from "../assets/Home.jpg";
import {
  RecruitmentQueueList,
  ResearchQueueList,
  StructureBuildQueueList,
} from "./StructureBuildQueueList";

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
  const now = Date.now();
  const buildQueueCount = showAll
    ? structureJobsForOffices(state).length
    : state.structureQueues[officeId].length;
  const researchQueueCount = showAll
    ? researchJobsForOffices(state).length
    : researchJobsAtOffice(state, officeId).length;
  const hireQueueCount = showAll
    ? recruitmentJobsForOffices(state).length
    : recruitmentJobsAtOffice(state, officeId).length;
  const projectedResearch = projectedResearchLevels(state);
  const researchActive = RESEARCH.filter(
    (def) => projectedResearch[def.id] > 0,
  );
  const portraitStorageKey = "corp-civ-idle-overview-portrait-size";
  const mergedQueueMax =
    officeIds.length * MAX_STRUCTURE_QUEUE;

  const overviewNetWorth = (
    <p
      className="tab-net-worth-inline"
      aria-label={`Net worth ${formatResourceShort(state.netWorth)} of ${formatResourceShort(WIN_NET_WORTH)} goal`}
    >
      <span className="tab-net-worth-label">Net worth</span>
      <strong className="tab-net-worth-value">
        {formatResourceShort(state.netWorth)}
      </strong>
      <span className="tab-net-worth-goal muted">
        / {formatResourceShort(WIN_NET_WORTH)}
      </span>
    </p>
  );

  const overviewBesidePortrait = (
    <>
      <TabSiteHeader
        title="Overview"
        state={state}
        dispatch={dispatch}
        titleExtra={overviewNetWorth}
      />
      <div className="tab-hero-queues">
        <section className="overview-section location-view-section tab-queue-section tab-compact-queue">
          <div className="tab-queue-heading">
            <h3>Building in progress</h3>
            <span
              className="tab-queue-count muted"
              aria-label={`Build queue ${buildQueueCount}`}
            >
              {buildQueueCount}
              {showAll ? "" : `/${MAX_STRUCTURE_QUEUE}`}
            </span>
          </div>
          <StructureBuildQueueList
            state={state}
            {...(showAll
              ? {
                  entries: structureJobsForOffices(state),
                  maxSlots: mergedQueueMax,
                }
              : {
                  jobs: state.structureQueues[officeId],
                  locationId: officeId,
                })}
            dispatch={dispatch}
            now={now}
            compact
            emptyLabel="No builds queued."
          />
        </section>
        <section className="overview-section location-view-section tab-queue-section tab-compact-queue">
          <div className="tab-queue-heading">
            <h3>Research in progress</h3>
            <span
              className="tab-queue-count muted"
              aria-label={`Research queue ${researchQueueCount}`}
            >
              {researchQueueCount}
              {showAll ? "" : `/${MAX_RESEARCH_QUEUE}`}
            </span>
          </div>
          <ResearchQueueList
            state={state}
            {...(showAll
              ? {
                  entries: researchJobsForOffices(state),
                  maxSlots: officeIds.length * MAX_RESEARCH_QUEUE,
                }
              : {
                  jobs: researchJobsAtOffice(state, officeId),
                  officeId,
                })}
            dispatch={dispatch}
            now={now}
            compact
            emptyLabel="No research queued."
          />
        </section>
        <section className="overview-section location-view-section tab-queue-section tab-compact-queue">
          <div className="tab-queue-heading">
            <h3>Hiring in progress</h3>
            <span
              className="tab-queue-count muted"
              aria-label={`Hiring queue ${hireQueueCount}`}
            >
              {hireQueueCount}
              {showAll ? "" : `/${MAX_RECRUIT_QUEUE}`}
            </span>
          </div>
          <RecruitmentQueueList
            state={state}
            {...(showAll
              ? {
                  entries: recruitmentJobsForOffices(state),
                  maxSlots: officeIds.length * MAX_RECRUIT_QUEUE,
                }
              : {
                  jobs: recruitmentJobsAtOffice(state, officeId),
                  officeId,
                })}
            dispatch={dispatch}
            now={now}
            compact
            emptyLabel="No hires queued."
          />
        </section>
      </div>
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
          {siteLabel}: no units on site.
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
      <section className="overview-section location-view-section">
        <h3>Structure levels{showAll ? "" : ` — ${officeLabel}`}</h3>
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

      <section className="overview-section location-view-section">
        <h3>Staff{showAll ? "" : ` — ${officeLabel}`}</h3>
        {showAll
          ? officeIds.map((siteId) =>
              renderStaff(siteId, officeDisplayName(state, siteId)),
            )
          : renderStaff(officeId, officeLabel)}
        {!showAll ? (
          <p className="muted overview-staff-total">
            Total on site: {formatNumber(totalWorkforce(rosterAt(state, officeId)))}
          </p>
        ) : (
          <p className="muted overview-staff-total">
            Firm total:{" "}
            {formatNumber(
              officeIds.reduce(
                (sum, siteId) => sum + totalWorkforce(rosterAt(state, siteId)),
                0,
              ),
            )}
          </p>
        )}
      </section>
    </>
  );

  return (
    <div className="main-view-panel location-view-panel overview-view">
      <div className="location-view-body">
        <TabPortraitLayout
          src={homePortrait}
          storageKey={portraitStorageKey}
          quote={tabQuote(state, "home")}
          portraitLayout="stretch"
          parallaxScroll={false}
          portraitLocked={false}
          allowPortraitResize={false}
          className="tab-portrait-fit"
        >
          {overviewBesidePortrait}
        </TabPortraitLayout>
        <div className="tab-below-portrait">{overviewBelowPortrait}</div>
      </div>
    </div>
  );
}
