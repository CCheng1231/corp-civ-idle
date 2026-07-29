import type { Dispatch } from "react";
import type { GameAction, GameState } from "../game/types";

interface NotesViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function NotesView({ state, dispatch }: NotesViewProps) {
  return (
    <div className="notes-view">
      <header className="notes-header">
        <h2>Notes</h2>
        <p className="muted">
          Jot down bids, research plans, or rival gossip — saved with your game.
        </p>
      </header>
      <textarea
        className="notes-editor"
        value={state.playerNotes}
        onChange={(event) =>
          dispatch({ type: "UPDATE_PLAYER_NOTES", notes: event.target.value })
        }
        placeholder="Start typing…"
        spellCheck
        aria-label="Player notes"
      />
    </div>
  );
}
