import { useState, type Dispatch } from "react";
import { MAX_STRUCTURE_QUEUE } from "../game/constants";
import { ownedOfficeIds } from "../game/mapWorld";
import {
  isAllOfficesSelected,
  resolveOfficeLocation,
  structureJobsForOffices,
} from "../game/officeSelection";
import { LocationSitePanel } from "./LocationSitePanel";
import { OfficeBuildQueueSection } from "./OfficeStructurePanel";
import { OfficeSiteSummary } from "./OfficeSiteSummary";
import { StructureBuildQueueList } from "./StructureBuildQueueList";
import { TabPortraitLayout } from "./TabPortraitLayout";
import { TabSiteHeader } from "./TabSiteHeader";
import { tabQuote } from "../game/tabQuotes";
import officePortrait from "../assets/office.jpg";
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
  const portraitStorageKey = "corp-civ-idle-operations-portrait-size";
  const buildEntries = structureJobsForOffices(state);
  const officeCount = ownedOfficeIds(state).length;

  const officeBesidePortrait = (
    <>
      <TabSiteHeader title="Building" state={state} dispatch={dispatch} />
      {showAll ? (
        <section className="location-view-section tab-queue-section tab-compact-queue">
          <div className="tab-queue-heading">
            <h3>Building in progress</h3>
            <span className="tab-queue-count muted">{buildEntries.length}</span>
          </div>
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
    <div className="main-view-panel location-view-panel operations-view">
      <div className="location-view-body">
        <TabPortraitLayout
          src={officePortrait}
          storageKey={portraitStorageKey}
          quote={tabQuote(state, "office")}
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
      </div>
    </div>
  );
}
