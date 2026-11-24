import type { Dispatch } from "react";
import type { GameAction, GovProgramModalKind } from "../game/types";

const INTRO_COPY: Partial<
  Record<
    GovProgramModalKind,
    { title: string; body: string; button?: string }
  >
> = {
  growth_report_intro: {
    title: "After-action reports",
    body:
      "When a field team finishes, a short report lands on Secretary → Job. Read it or dismiss it with × — either counts for this step.",
    button: "Show me",
  },
  growth_research_intro: {
    title: "R&D voucher",
    body:
      "Research unlocks structures, payouts, and branch tools. Queue one project at HQ — it spends cash and runs in real time.",
    button: "Show me",
  },
  growth_bm_hint_intro: {
    title: "Branch lead (optional)",
    body:
      "You can expand later with Branch Management research and a Branch Manager hire. This step is a heads-up only — no action required.",
    button: "Got it",
  },
  growth_bm_hired_intro: {
    title: "Hire a Branch Manager",
    body:
      "When Branch Management is researched, recruit a Branch Manager here. They unlock opening branch offices on the world map.",
    button: "Show me",
  },
};

interface GovProgramGrowthTutorialIntroProps {
  modal: GovProgramModalKind;
  dispatch: Dispatch<GameAction>;
}

/** Step 4–7 entry coach — full-screen card before spotlight chain. */
export function GovProgramGrowthTutorialIntro({
  modal,
  dispatch,
}: GovProgramGrowthTutorialIntroProps) {
  const copy = INTRO_COPY[modal];
  if (!copy) return null;

  return (
    <div
      className="modal-backdrop gov-program-growth-tutorial-backdrop"
      role="presentation"
    >
      <div
        className="modal gov-program-growth-tutorial-card"
        role="dialog"
        aria-labelledby="gov-growth-tutorial-title"
      >
        <h2 id="gov-growth-tutorial-title">{copy.title}</h2>
        <p className="gov-program-growth-tutorial-copy">{copy.body}</p>
        <div className="gov-program-tutorial-actions">
          <button
            type="button"
            className="btn primary gov-program-tutorial-btn"
            onClick={() => dispatch({ type: "GOV_DISMISS_MODAL" })}
          >
            {copy.button ?? "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}