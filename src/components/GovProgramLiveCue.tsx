import type { Dispatch } from "react";
import {
  govProgramLiveCue,
  type GovProgramCueScreen,
} from "../game/govProgramLiveCue";
import type { GameAction, GameState } from "../game/types";

interface GovProgramLiveCueProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  screen: GovProgramCueScreen;
  onLocalAction?: (
    id: "job-board" | "job-reports" | "open-chief-candidate",
  ) => void;
  /** Hide the cue button when that local panel is already open. */
  activeLocalId?: "job-board" | "job-reports" | "open-chief-candidate";
}

export function GovProgramLiveCue({
  state,
  dispatch,
  screen,
  onLocalAction,
  activeLocalId,
}: GovProgramLiveCueProps) {
  const cue = govProgramLiveCue(state, screen);
  if (!cue) return null;
  const action =
    cue.action?.kind === "local" && cue.action.id === activeLocalId
      ? undefined
      : cue.action;

  return (
    <section className="gov-program-live-cue" aria-label="Program step">
      <p>
        <strong>{cue.title}</strong>
        <span> — {cue.instruction}</span>
      </p>
      {action ? (
        <button
          type="button"
          className="btn tab gov-program-step-go"
          onClick={() => {
            if (action.kind === "game") {
              dispatch(action.action);
              return;
            }
            onLocalAction?.(action.id);
          }}
        >
          {action.label}
        </button>
      ) : null}
    </section>
  );
}
