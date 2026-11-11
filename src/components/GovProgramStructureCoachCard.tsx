import type { Dispatch } from "react";
import { formatNumber } from "../game/constants";
import { secretaryById } from "../game/secretaryData";
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
  footer?: string;
  showReward?: boolean;
}

/** Shown on Structure tab directly under “Structure in progress”. */
export function GovProgramStructureCoachCard({
  state,
  dispatch,
  footer = "Click OK for next step.",
  showReward = true,
}: GovProgramStructureCoachCardProps) {
  const aide = secretaryById("secretary_01");
  const rewards = showReward ? structureQueueCoachRewardLines(state) : [];

  return (
    <aside
      className="gov-program-structure-coach-card"
      role="dialog"
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
        <h2 id="gov-structure-queue-title">{aide.name}</h2>
        <p className="gov-program-coach-modal-lead gov-program-coach-status-done">
          Completed
        </p>
        {rewards.length > 0 ? (
          <p className="gov-program-coach-modal-reward">
            <span className="gov-program-coach-modal-reward-label">Reward</span>{" "}
            {rewards.join(" · ")}
          </p>
        ) : null}
        <p className="muted gov-program-coach-modal-foot">{footer}</p>
        <div className="gov-program-coach-card-actions">
          <button
            type="button"
            className="btn primary gov-program-coach-card-ok"
            onClick={() => dispatch({ type: "GOV_DISMISS_MODAL" })}
          >
            OK
          </button>
        </div>
      </div>
    </aside>
  );
}
