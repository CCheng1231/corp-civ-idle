import type { Dispatch } from "react";
import { secretaryById } from "../game/secretaryData";
import { secretaryRosterPortraitSrc } from "../game/secretaryAssets";
import type { GameAction, GameState } from "../game/types";

interface GovProgramModalProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function GovProgramModal({ state, dispatch }: GovProgramModalProps) {
  const modal = state.govProgram?.pendingModal;
  if (modal === "structure_queue_coach") {
    return null;
  }

  if (modal !== "xaihi_intro" && modal !== "surtr_beat") return null;

  if (modal === "xaihi_intro") {
    const xaihi = secretaryById("secretary_02");
    return (
      <div className="modal-backdrop gov-program-modal-backdrop" role="presentation">
        <div
          className="modal gov-program-intro-modal"
          role="dialog"
          aria-labelledby="gov-intro-title"
        >
          <header className="modal-header">
            <h2 id="gov-intro-title">{xaihi.name}</h2>
          </header>
          <div className="gov-program-intro-body">
            <img
              className="gov-program-intro-portrait"
              src={secretaryRosterPortraitSrc("secretary_02")}
              alt=""
            />
            <p>
              Regional office assigns me to your firm now that you have ten
              contractors on payroll. I coordinate field teams and keep
              timelines honest.
            </p>
          </div>
          <footer className="confirm-dialog-actions">
            <button
              type="button"
              className="btn primary"
              onClick={() => dispatch({ type: "GOV_DISMISS_MODAL" })}
            >
              Continue
            </button>
          </footer>
        </div>
      </div>
    );
  }

  const surtr = secretaryById("secretary_01");
  return (
    <div className="modal-backdrop gov-program-modal-backdrop" role="presentation">
      <div
        className="modal gov-program-intro-modal"
        role="dialog"
        aria-labelledby="gov-surtr-title"
      >
        <header className="modal-header">
          <h2 id="gov-surtr-title">{surtr.name}</h2>
        </header>
        <div className="gov-program-intro-body">
          <p>
            I wanted to lead that charter team myself. Field work is how directors
            learn who they can trust — pick your Chief of Staff on Roster when you
            are ready.
          </p>
        </div>
        <footer className="confirm-dialog-actions">
          <button
            type="button"
            className="btn primary"
            onClick={() => dispatch({ type: "GOV_DISMISS_MODAL" })}
          >
            Continue
          </button>
        </footer>
      </div>
    </div>
  );
}
