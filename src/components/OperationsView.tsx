import { useState, type Dispatch } from "react";
import { MAX_STRUCTURE_QUEUE } from "../game/constants";
import { ownedOfficeIds } from "../game/mapWorld";
import {
  isAllOfficesSelected,
  resolveOfficeLocation,
  structureJobsForOffices,
} from "../game/officeSelection";
import { CompactQueueHeading } from "./CompactQueueHeading";
import { LocationSitePanel } from "./LocationSitePanel";
import { OfficeBuildQueueSection } from "./OfficeStructurePanel";
import { OfficeSiteSummary } from "./OfficeSiteSummary";
import { StructureBuildQueueList } from "./StructureBuildQueueList";
import { TabPortraitLayout } from "./TabPortraitLayout";
import { TabSiteHeader } from "./TabSiteHeader";
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
  const buildEntries = structureJobsForOffices(state);
  const officeCount = ownedOfficeIds(state).length;

  const officeBesidePortrait = (
    <>
      <TabSiteHeader homeHubTab="operations" state={state} dispatch={dispatch} />
      {showAll ? (
        <section className="location-view-section tab-queue-section tab-compact-queue">
          <CompactQueueHeading
            title="Structure in progress"
            count={buildEntries.length}
            countAriaLabel={`Structure queue ${buildEntries.length}`}
          />
          <StructureBuildQueueList
            state={state}
            entries={buildEntries}
            dispatch={dispatch}
            compact
            maxSlots={officeCount * MAX_STRUCTURE_QUEUE}
            emptyLabel=""
          />
        </section>
      ) : (
        <OfficeBuildQueueSection
          state={state}
          dispatch={dispatch}
          officeId={officeId}
          compact
          hideCompleted={hideCompleted}
          onHideCompletedChange={setHideCompleted}
        />
      )}
    </>
  );

  return (
    <div className="main-view-panel location-view-panel operations-view hub-synced-tab-view">
      <HubSyncedTabBackground chiefId={state.chiefOfStaffId} />
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
              dispatch={dispatch}
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
    </div>
  );
}
