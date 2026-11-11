import { useEffect, useState, type Dispatch } from "react";
import { MAX_STRUCTURE_QUEUE } from "../game/constants";
import { officeDisplayName, ownedOfficeIds } from "../game/mapWorld";
import {
  isAllOfficesSelected,
  resolveOfficeLocation,
} from "../game/officeSelection";
import { LocationSitePanel } from "./LocationSitePanel";
import { OfficeBuildQueueSection } from "./OfficeStructurePanel";
import { OfficeSiteSummary } from "./OfficeSiteSummary";
import { ProgressionCatalogInfoDialog } from "./ProgressionCatalogInfoDialog";
import { GovProgramLiveCue } from "./GovProgramLiveCue";
import { GovProgramStructureCoachCard } from "./GovProgramStructureCoachCard";
import { GovProgramStructureQueueIntro } from "./GovProgramStructureQueueIntro";
import { ProgressionTabStickyChrome } from "./ProgressionTabStickyChrome";
import { StructureBuildQueueList } from "./StructureBuildQueueList";
import { TabPortraitLayout } from "./TabPortraitLayout";
import { HubSyncedTabBackground } from "./HubSyncedTabBackground";
import { HubSyncedTabScrollBody } from "./HubSyncedTabScrollBody";
import type { GameAction, GameState, OfficeLocationId } from "../game/types";

interface OperationsViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

/** Nav: Build — structure upgrades per HQ/Branch. */
export function OperationsView({ state, dispatch }: OperationsViewProps) {
  const showAll = isAllOfficesSelected(state.selectedOffice);
  const officeId: OfficeLocationId = resolveOfficeLocation(state);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [tabInfoOpen, setTabInfoOpen] = useState(false);
  const structureQueueIntro =
    state.govProgram?.pendingModal === "structure_queue_intro";
  const structureQueueCoach =
    state.govProgram?.pendingModal === "structure_queue_coach";
  const structureQueueCoachJobId =
    state.govProgram?.structureQueueCoachJobId ?? null;
  const structureQueueCoachUi = structureQueueIntro || structureQueueCoach;

  useEffect(() => {
    if (!structureQueueCoachUi) return;
    const scrollParent = document.querySelector(
      ".operations-view.hub-synced-tab-view .hub-synced-tab-scroll-body",
    );
    scrollParent?.scrollTo({ top: 0, behavior: "smooth" });
    const anchor = document.getElementById("gov-program-structure-queue-anchor");
    anchor?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [structureQueueCoachUi, structureQueueCoachJobId]);

  const officeBesidePortrait = (
    <>
      {showAll ? (
        ownedOfficeIds(state).map((siteId) => {
          const siteQueue = state.structureQueues[siteId] ?? [];
          return (
            <section
              key={siteId}
              className="location-view-section tab-queue-section tab-compact-queue"
            >
              <div className="tab-queue-heading">
                <h3>{officeDisplayName(state, siteId)}</h3>
                <span
                  className="tab-queue-count muted"
                  aria-label={`Structure queue ${siteQueue.length} of ${MAX_STRUCTURE_QUEUE}`}
                >
                  {siteQueue.length}/{MAX_STRUCTURE_QUEUE}
                </span>
              </div>
              <StructureBuildQueueList
                state={state}
                jobs={siteQueue}
                locationId={siteId}
                dispatch={dispatch}
                now={Date.now()}
                compact
                emptyLabel=""
              />
            </section>
          );
        })
      ) : (
        <OfficeBuildQueueSection
          state={state}
          dispatch={dispatch}
          officeId={officeId}
          compact
          coachHighlight={structureQueueCoachUi}
          coachHighlightJobId={structureQueueCoachJobId}
        />
      )}
      {structureQueueIntro ? (
        <GovProgramStructureQueueIntro dispatch={dispatch} />
      ) : null}
      {structureQueueCoach ? (
        <GovProgramStructureCoachCard state={state} dispatch={dispatch} />
      ) : null}
    </>
  );

  return (
    <div className="main-view-panel location-view-panel operations-view hub-synced-tab-view hub-synced-tab-view--progression-freeze">
      <HubSyncedTabBackground chiefId={state.chiefOfStaffId} />
      <div className="progression-tab-frozen-header">
        <ProgressionTabStickyChrome
          homeHubTab="operations"
          state={state}
          dispatch={dispatch}
          onInfo={() => setTabInfoOpen(true)}
        >
          <GovProgramLiveCue
            state={state}
            dispatch={dispatch}
            screen="operations"
          />
        </ProgressionTabStickyChrome>
      </div>
      <HubSyncedTabScrollBody>
        <TabPortraitLayout
          storageKey="corp-civ-idle-operations-portrait-size"
          portraitSpacer
          portraitLayout="stretch"
          parallaxScroll={false}
          portraitLocked={false}
          allowPortraitResize={false}
          className="tab-portrait-fit"
        >
          {officeBesidePortrait}
        </TabPortraitLayout>
        <div className="tab-below-portrait">
          {!showAll ? (
            <OfficeSiteSummary
              state={state}
              officeId={officeId}
              variant="banner"
            />
          ) : null}
          <LocationSitePanel
            state={state}
            dispatch={dispatch}
            officeId={officeId}
            hideCompleted={hideCompleted}
            onHideCompletedChange={setHideCompleted}
            showBuildQueue={false}
            readOnly={showAll}
          />
        </div>
      </HubSyncedTabScrollBody>
      {tabInfoOpen ? (
        <ProgressionCatalogInfoDialog
          kind="structures"
          onClose={() => setTabInfoOpen(false)}
        />
      ) : null}
    </div>
  );
}
