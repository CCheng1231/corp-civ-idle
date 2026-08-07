import type { CompletionAlert, GameState } from "./types";

const MAX_PENDING_COMPLETION_ALERTS = 8;

export function pushCompletionAlert(
  state: GameState,
  alert: Omit<CompletionAlert, "id">,
  notify: boolean,
): GameState {
  if (!notify || !state.settings.notifications) return state;
  const entry: CompletionAlert = {
    ...alert,
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  const pending = [...(state.pendingCompletionAlerts ?? []), entry].slice(
    -MAX_PENDING_COMPLETION_ALERTS,
  );
  return { ...state, pendingCompletionAlerts: pending };
}
