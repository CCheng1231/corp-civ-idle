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
  if (modal !== "gessesa_intro" && modal !== "lafe_beat") return null;

  if (modal === "gessesa_intro") {
    const gessesa = secretaryById("secretary_02");
    return (
      <div className="modal-backdrop gov-program-modal-backdrop" role="presentation">
        <div
          className="modal gov-program-intro-modal"
          role="dialog"
          aria-labelledby="gov-intro-title"
        >
          <header className="modal-header">
            <h2 id="gov-intro-title">{gessesa.name}</h2>
          </header>
          <div className="gov-program-intro-body">
            <img
              className="gov-program-intro-portrait"
              src={secretaryRosterPortraitSrc("secretary_02")}
              alt=""
            />
            <p>
              Regional office assigns me to your firm now that you have ten
              contractors on payroll. I coordinate task forces and keep field
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

  const lafe = secretaryById("secretary_01");
  return (
    <div className="modal-backdrop gov-program-modal-backdrop" role="presentation">
      <div
        className="modal gov-program-intro-modal"
        role="dialog"
        aria-labelledby="gov-lafe-title"
      >
        <header className="modal-header">
          <h2 id="gov-lafe-title">{lafe.name}</h2>
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
