import { useEffect, useState, type Dispatch } from "react";
import { formatNumber } from "../game/constants";
import {
  branchEstablishmentPhase,
  branchEstablishmentStatusLabel,
} from "../game/branchEstablishment";
import { activePlayerId } from "../multiplayer/playerHq";
import {
  engagementStatusLabel,
  jobDefinitionById,
} from "../game/jobs";
import {
  secretaryJobSummary,
} from "../game/secretaryBriefing";
import { secretaryById } from "../game/secretaryData";
import { totalAssigned } from "../game/unitEffects";
import type { GameAction, GameState } from "../game/types";
import {
  SecretaryBriefing,
  initialSecretaryWorkTab,
  type SecretaryWorkTab,
} from "./SecretaryBriefing";
import { TabPortraitLayout } from "./TabPortraitLayout";
import { GovProgramLiveCue } from "./GovProgramLiveCue";
import { ProgressionTabStickyChrome } from "./ProgressionTabStickyChrome";
import { HubSyncedTabBackground } from "./HubSyncedTabBackground";
import { HubSyncedTabScrollBody } from "./HubSyncedTabScrollBody";
import { TeamStatusIcon } from "./TeamStatusIcon";

const SECRETARY_PORTRAIT_SIZE_KEY = "corp-civ-idle-secretary-portrait-size";

interface OfficeViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

/** Nav: Secretary — briefing, job reports, and job board. */
export function OfficeView({ state, dispatch }: OfficeViewProps) {
  const { active, cap } = secretaryJobSummary(state);
  const now = Date.now();
  const [workTab, setWorkTab] = useState<SecretaryWorkTab>(initialSecretaryWorkTab);
  const displayWorkTab: SecretaryWorkTab =
    state.jobFocusPostingId != null ? "board" : workTab;

  useEffect(() => {
    if (state.jobFocusPostingId) {
      setWorkTab("board");
    }
  }, [state.jobFocusPostingId]);

  const ownerId = activePlayerId(state);
  const branchTransits = state.branchEstablishmentTransits.filter(
    (t) => t.ownerPlayerId === ownerId,
  );
  const showTeamList =
    state.jobEngagements.length > 0 || branchTransits.length > 0;

  const secretaryTeamsPanel = (
    <section
      className="secretary-teams-beside tab-queue-section tab-compact-queue"
      aria-label={`Teams ${active} of ${cap}`}
    >
        <div className="tab-queue-heading">
          <h3>Teams</h3>
          <span className="tab-queue-count muted">
            {active}/{cap}
          </span>
        </div>
        {showTeamList ? (
          <div className="build-queue-slot" data-max-slots={cap}>
            <ul className="build-queue">
              {branchTransits.map((transit) => {
                const phase = branchEstablishmentPhase(transit);
                const status = branchEstablishmentStatusLabel(
                  state,
                  transit,
                  now,
                );
                const tip = `Branch Manager · new branch · ${status}`;
                return (
                  <li
                    key={transit.id}
                    className="build-queue-row-with-cancel secretary-team-row secretary-team-row-branch-establish"
                    data-tip={tip}
                    aria-label={tip}
                  >
                    <TeamStatusIcon phase={phase} />
                    <div className="secretary-team-row-body">
                      <span className="queue-name">Branch Manager</span>
                      <span className="queue-status">{status}</span>
                    </div>
                    {phase === "outbound" ? (
                      <button
                        type="button"
                        className="map-hex-job-send queue-cancel-btn"
                        onClick={() =>
                          dispatch({
                            type: "CANCEL_BRANCH_ESTABLISHMENT",
                            transitId: transit.id,
                          })
                        }
                      >
                        Cancel
                      </button>
                    ) : null}
                  </li>
                );
              })}
              {state.jobEngagements.map((engagement) => {
                const def = jobDefinitionById(engagement.definitionId);
                const units = totalAssigned(engagement.crewAssigned);
                const earned =
                  engagement.phase === "working"
                    ? ` · $${formatNumber(engagement.earnedSoFar)}`
                    : "";
                const status = engagementStatusLabel(state, engagement, now);
                const leadName = engagement.teamLeadSecretaryId
                  ? secretaryById(engagement.teamLeadSecretaryId).name
                  : null;
                const tip = `${def.title} · ${units} unit${units === 1 ? "" : "s"}${earned} · ${status}${leadName ? ` · Lead ${leadName}` : ""}`;
                return (
                  <li
                    key={engagement.id}
                    className="build-queue-row-with-cancel secretary-team-row"
                    data-tip={tip}
                    aria-label={tip}
                  >
                    <TeamStatusIcon phase={engagement.phase} />
                    <div className="secretary-team-row-body">
                      <span className="queue-name">{def.title}</span>
                      <span className="queue-status">{status}</span>
                    </div>
                    {engagement.phase === "outbound" ||
                    engagement.phase === "working" ? (
                      <button
                        type="button"
                        className="map-hex-job-send queue-cancel-btn"
                        onClick={() =>
                          dispatch({
                            type: "CANCEL_JOB_ENGAGEMENT",
                            engagementId: engagement.id,
                          })
                        }
                      >
                        Cancel
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
    </section>
  );

  return (
    <div
      className={`main-view-panel location-view-panel secretary-view secretary-view--work-${displayWorkTab} hub-synced-tab-view hub-synced-tab-view--progression-freeze`}
    >
      <HubSyncedTabBackground
        chiefId={state.chiefOfStaffId}
        portraitSource="secretary"
      />
      <div className="progression-tab-frozen-header">
        <ProgressionTabStickyChrome
          secretaryHubTab="job"
          state={state}
          dispatch={dispatch}
        >
          <GovProgramLiveCue
            state={state}
            dispatch={dispatch}
            screen="job"
            activeLocalId={
              displayWorkTab === "reports" ? "job-reports" : "job-board"
            }
            onLocalAction={(id) => {
              if (id === "job-board") setWorkTab("board");
              if (id === "job-reports") setWorkTab("reports");
            }}
          />
        </ProgressionTabStickyChrome>
      </div>
      <HubSyncedTabScrollBody>
        <TabPortraitLayout
          storageKey={SECRETARY_PORTRAIT_SIZE_KEY}
          portraitSpacer
          portraitLayout="stretch"
          parallaxScroll={false}
          portraitLocked={false}
          allowPortraitResize={false}
          className="tab-portrait-fit"
        >
          {null}
        </TabPortraitLayout>
        <div className="hub-synced-tab-portrait-reveal" aria-hidden />
        <div className="tab-below-portrait">
          {secretaryTeamsPanel}
          <SecretaryBriefing
            state={state}
            dispatch={dispatch}
            workTab={displayWorkTab}
            onWorkTabChange={setWorkTab}
          />
        </div>
      </HubSyncedTabScrollBody>
    </div>
  );
}
