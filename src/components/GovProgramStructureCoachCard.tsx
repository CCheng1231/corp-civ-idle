import type { Dispatch } from "react";
import { createPortal } from "react-dom";
import { formatNumber } from "../game/constants";
import { govGrowthStepProgress } from "../game/govProgram";
import { govGrowthStepCoachFooter } from "../game/govProgramGrowthCoachCopy";
import { secretaryRosterPortraitSrc } from "../game/secretaryAssets";
import type { GameAction, GameState } from "../game/types";

function structureQueueCoachRewardLines(state: GameState): string[] {
  const g = state.govProgram;
  if (!g) return [];
  const lines: string[] = [];
  if (g.structureQueueCoachRewardCash) {
    lines.push(`+${formatNumber(g.structureQueueCoachRewardCash)} Cash`);
  }
  if (g.structureQueueCoachRewardSupply) {
    lines.push(`+${formatNumber(g.structureQueueCoachRewardSupply)} SUP`);
  }
  if (g.structureQueueCoachRewardConnection) {
    lines.push(
      `+${formatNumber(g.structureQueueCoachRewardConnection)} Connection`,
    );
  }
  return lines;
}

interface GovProgramStructureCoachCardProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  /** Defaults to “Growth Track Step N/M Completed!” from active growth step. */
  headline?: string;
  footer?: string;
  showReward?: boolean;
  /** Floating modal (does not push queue/catalog layout). */
  presentation?: "inline" | "overlay";
}

function growthTrackCompletedHeadline(state: GameState): string {
  const progress = govGrowthStepProgress(state);
  if (!progress) return "Growth track step completed!";
  return `Growth Track Step ${progress.current}/${progress.total} Completed!`;
}

/** Growth-track reward / nudge card (Structure or Recruit tab). */
export function GovProgramStructureCoachCard({
  state,
  dispatch,
  headline,
  footer,
  showReward = true,
  presentation = "inline",
}: GovProgramStructureCoachCardProps) {
  const rewards = showReward ? structureQueueCoachRewardLines(state) : [];
  const resolvedHeadline = headline ?? growthTrackCompletedHeadline(state);
  const growthStepId =
    state.govProgram?.growthStepId ??
    state.govProgram?.growthCompletedStepIds.at(-1);
  const resolvedFooter =
    footer ?? govGrowthStepCoachFooter(growthStepId);

  const card = (
    <aside
      className="gov-program-structure-coach-card"
      role="dialog"
      aria-modal={presentation === "overlay" ? true : undefined}
      aria-labelledby="gov-structure-queue-title"
    >
      <div className="gov-program-coach-card-portrait-col" aria-hidden>
        <img
          className="gov-program-coach-card-portrait"
          src={secretaryRosterPortraitSrc("secretary_01")}
          alt=""
        />
      </div>
      <div className="gov-program-coach-card-main">
        <h2 id="gov-structure-queue-title">{resolvedHeadline}</h2>
        {rewards.length > 0 ? (
          <p className="gov-program-coach-modal-reward">
            <span className="gov-program-coach-modal-reward-label">Reward</span>{" "}
            {rewards.join(" · ")}
          </p>
        ) : null}
        <p className="gov-program-tutorial-copy gov-program-coach-modal-foot">
          {resolvedFooter}
        </p>
        <div className="gov-program-coach-card-actions">
          <button
            type="button"
            className="btn primary gov-program-tutorial-btn"
            onClick={() => dispatch({ type: "GOV_DISMISS_MODAL" })}
          >
            OK
          </button>
        </div>
      </div>
    </aside>
  );

  if (presentation === "overlay") {
    return createPortal(
      <>
        <div
          className="gov-program-coach-intro-backdrop"
          role="presentation"
          aria-hidden
        />
        <div className="gov-program-coach-card-floating-wrap">{card}</div>
      </>,
      document.body,
    );
  }

  return card;
}