import { useState, type Dispatch } from "react";
import {
  GOV_DAILY_QUESTS,
  GOV_RECRUIT_UNLOCK_COUNT,
} from "../game/govProgramData";
import {
  govCharterCanEngage,
  govCurrentExecutiveStep,
  govCurrentGrowthStep,
  govEngageLockActive,
  govExecutiveTrackActive,
  govGrowthProgramOfferVisible,
  govGrowthTrackPaused,
} from "../game/govProgram";
import { resolveOfficeLocation } from "../game/officeSelection";
import { secretaryById } from "../game/secretaryData";
import type { GameAction, GameState } from "../game/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { GovProgramStepGuidance } from "./GovProgramStepGuidance";
import { HubSyncedTabBackground } from "./HubSyncedTabBackground";
import { HubSyncedTabScrollBody } from "./HubSyncedTabScrollBody";
import { ProgressionCatalogInfoDialog } from "./ProgressionCatalogInfoDialog";
import { ProgressionTabStickyChrome } from "./ProgressionTabStickyChrome";
import { TabPortraitLayout } from "./TabPortraitLayout";

const GOV_PROGRAM_PORTRAIT_SIZE_KEY =
  "corp-civ-idle-gov-program-portrait-size";

interface GovernmentProgramViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function GovernmentProgramView({
  state,
  dispatch,
}: GovernmentProgramViewProps) {
  const gp = state.govProgram;
  const [declineOpen, setDeclineOpen] = useState(false);
  const [tabInfoOpen, setTabInfoOpen] = useState(false);
  const growthStep = govCurrentGrowthStep(state);
  const execStep = govCurrentExecutiveStep(state);
  const offer = govGrowthProgramOfferVisible(state);
  const officeId = resolveOfficeLocation(state);
  const dailyQuest = GOV_DAILY_QUESTS.find(
    (q) => q.questId === gp.calendar.activeDailyQuestId,
  );
  const now = Date.now();
  const dailyReady =
    dailyQuest &&
    gp.calendar.dailyProgress >= Number(dailyQuest.param) &&
    (!gp.calendar.lastDailyClaimAt ||
      now - gp.calendar.lastDailyClaimAt >= 86_400_000);

  const programContent = (
    <div className="gov-program-view">
      {offer ? (
        <section className="gov-program-card">
          <h3>Regional growth program</h3>
          <p className="muted">
            Short guided steps with stipends. You can decline and still play — you
            will miss stipends and some onboarding.
          </p>
          <div className="gov-program-actions">
            <button
              type="button"
              className="btn primary"
              onClick={() => dispatch({ type: "GOV_ACCEPT_GROWTH" })}
            >
              Accept program
            </button>
            <button
              type="button"
              className="tab"
              onClick={() => setDeclineOpen(true)}
            >
              Decline
            </button>
          </div>
        </section>
      ) : null}

      {gp.growthAccepted && !gp.growthDeclined ? (
        <section className="gov-program-card">
          <h3>Growth track</h3>
          {govGrowthTrackPaused(state) ? (
            <p className="gov-program-banner" role="status">
              Paused at {GOV_RECRUIT_UNLOCK_COUNT} hires — finish the executive
              charter on this tab or skip it to resume.
            </p>
          ) : null}
          {growthStep ? (
            <>
              <h4>{growthStep.title}</h4>
              <p>{growthStep.body}</p>
              <GovProgramStepGuidance
                state={state}
                dispatch={dispatch}
                kind="growth"
                step={growthStep}
              />
              <p className="muted">
                Lifetime recruits: {gp.lifetimeRecruits} /{" "}
                {GOV_RECRUIT_UNLOCK_COUNT}
              </p>
            </>
          ) : (
            <p className="muted">Growth track complete.</p>
          )}
        </section>
      ) : null}

      {govExecutiveTrackActive(state) && execStep ? (
        <section className="gov-program-card">
          <h3>Executive attaché</h3>
          <h4>{execStep.title}</h4>
          <p>{execStep.body}</p>
          <GovProgramStepGuidance
            state={state}
            dispatch={dispatch}
            kind="executive"
            step={execStep}
          />
          {execStep.stepId === "exec_charter_engage" ? (
            <>
              <p className="muted">
                One-time program charter — instant deployment. Requires{" "}
                {GOV_RECRUIT_UNLOCK_COUNT} available units at this office.
              </p>
              <button
                type="button"
                className="btn primary"
                disabled={!govCharterCanEngage(state, officeId)}
                onClick={() =>
                  dispatch({ type: "GOV_ENGAGE_CHARTER", officeId })
                }
              >
                Engage charter
              </button>
            </>
          ) : null}
          {gp.chiefLessonPending ? (
            <p className="gov-program-banner" role="status">
              Assign Chief of Staff on Roster (required once).
            </p>
          ) : null}
          {!gp.charterSkipped && !gp.charterCompleted ? (
            <button
              type="button"
              className="tab gov-program-skip-charter"
              onClick={() => dispatch({ type: "GOV_SKIP_CHARTER" })}
            >
              Skip charter
            </button>
          ) : null}
        </section>
      ) : null}

      {gp.growthDeclined && gp.lifetimeRecruits >= GOV_RECRUIT_UNLOCK_COUNT ? (
        <section className="gov-program-card">
          <h3>Executive attaché</h3>
          <p className="muted">
            {secretaryById("secretary_02").name} is available on Roster when the
            intro is complete.
          </p>
        </section>
      ) : null}

      {govEngageLockActive(state) ? (
        <p className="gov-program-lock-note muted" role="status">
          Other job engages are locked until the charter is complete or skipped.
        </p>
      ) : null}

      <section className="gov-program-card">
        <h3>Daily contract</h3>
        {dailyQuest ? (
          <>
            <p>{dailyQuest.title}</p>
            <p className="muted">
              Progress: {gp.calendar.dailyProgress} / {dailyQuest.param}
            </p>
            <button
              type="button"
              className="btn primary"
              disabled={!dailyReady}
              onClick={() =>
                dispatch({ type: "GOV_CLAIM_DAILY", now: Date.now() })
              }
            >
              Claim stipend
            </button>
          </>
        ) : (
          <p className="muted">No daily quest configured.</p>
        )}
      </section>
    </div>
  );

  return (
    <div className="main-view-panel location-view-panel operations-view gov-program-view-panel hub-synced-tab-view hub-synced-tab-view--progression-freeze">
      <HubSyncedTabBackground
        chiefId={state.chiefOfStaffId}
        portraitSource="secretary"
      />
      <div className="progression-tab-frozen-header">
        <ProgressionTabStickyChrome
          secretaryHubTab="govProgram"
          state={state}
          dispatch={dispatch}
          onInfo={() => setTabInfoOpen(true)}
        />
      </div>
      {declineOpen ? (
        <ConfirmDialog
          title="Decline growth program?"
          message={`You will not receive growth stipends or guided steps. At ten hires you can still meet ${secretaryById("secretary_02").name} — without the charter lesson or ${secretaryById("secretary_01").name} Chief tutorial.`}
          confirmLabel="Decline program"
          cancelLabel="Stay enrolled"
          confirmTone="primary"
          onCancel={() => setDeclineOpen(false)}
          onConfirm={() => {
            setDeclineOpen(false);
            dispatch({ type: "GOV_DECLINE_GROWTH" });
          }}
        />
      ) : null}
      <HubSyncedTabScrollBody>
        <TabPortraitLayout
          storageKey={GOV_PROGRAM_PORTRAIT_SIZE_KEY}
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
        <div className="tab-below-portrait">{programContent}</div>
      </HubSyncedTabScrollBody>
      {tabInfoOpen ? (
        <ProgressionCatalogInfoDialog
          kind="govProgram"
          onClose={() => setTabInfoOpen(false)}
        />
      ) : null}
    </div>
  );
}
