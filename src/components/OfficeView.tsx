import type { Dispatch } from "react";
import type { GameAction, GameState } from "../game/types";
import { LocationStructureQueues } from "./LocationStructureQueues";
import { ContractorOfficeRoster } from "./ContractorOfficeRoster";

interface OfficeViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const LINES = [
  "Welcome back, boss. Another day, another bid war you pretend not to enjoy.",
  "Debt clock is ticking — but at least the coffee machine runs on passive income.",
  "Phase 2 unlocks when rivals start sniffing your Mango contracts.",
];

export function OfficeView({ state, dispatch }: OfficeViewProps) {
  const line = LINES[state.completedProjects % LINES.length];

  return (
    <div className="office-view">
      <div className="office-scene">
        <div className="secretary-desk">
          <div className="secretary-portrait" aria-hidden>
            <span>Secretary</span>
            <small>Anime office companion — art placeholder</small>
          </div>
          <div className="dialogue-box">
            <p>{line}</p>
            <p className="muted">
              Completed jobs: {state.completedProjects}. Net worth rank coming
              with multiplayer leaderboard.
            </p>
          </div>
        </div>
        <div className="office-stats">
          <div>
            <span>Cash runway</span>
            <strong>{Math.floor(state.resources.cash)}</strong>
          </div>
          <div>
            <span>Connection</span>
            <strong>{state.resources.connection.toFixed(1)}</strong>
          </div>
          <div>
            <span>Reputation</span>
            <strong>{state.resources.reputation.toFixed(1)}</strong>
          </div>
        </div>
      </div>
      <ContractorOfficeRoster state={state} dispatch={dispatch} />
      <LocationStructureQueues state={state} />
    </div>
  );
}
