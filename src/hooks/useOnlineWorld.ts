import { useEffect, useRef, useState, type Dispatch } from "react";
import type { GameAction, GameState } from "../game/types";
import type { OnlineSession } from "../multiplayer/types";
import { activePlayerId } from "../multiplayer/playerHq";
import { isFirebaseConfigured } from "../multiplayer/firebase";
import {
  ensureWorldBootstrapped,
  flushPostingWorkDelta,
  loadPrivateState,
  replaceClosedPosting,
  expireSharedPosting,
  savePrivateState,
  seedSharedJobPostingsIfNeeded,
  subscribeCompanies,
  subscribeJobPostings,
  subscribePrivateState,
  upsertCompanyPresence,
} from "../multiplayer/worldSync";
import { loadOnlineStateFromRemote } from "../game/save";

const FLUSH_INTERVAL_MS = 5000;
const PRESENCE_INTERVAL_MS = 15000;
const PRIVATE_SAVE_MS = 500;
const IGNORE_OWN_REMOTE_MS = 2000;

interface UseOnlineWorldOptions {
  session: OnlineSession;
  state: GameState;
  dispatch: Dispatch<GameAction>;
  enabled: boolean;
}

export function useOnlineWorld({
  session,
  state,
  dispatch,
  enabled,
}: UseOnlineWorldOptions): void {
  const stateRef = useRef(state);
  stateRef.current = state;
  const handledCompletedRef = useRef<Set<string>>(new Set());
  const handledClosedRef = useRef<Set<string>>(new Set());
  const ignoreRemoteUntilRef = useRef(0);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    if (!enabled || !isFirebaseConfigured()) return;

    let cancelled = false;
    dispatch({ type: "SET_ONLINE_CONNECTION_STATUS", status: "connecting" });

    async function bootstrap() {
      try {
        await ensureWorldBootstrapped(session);
        await seedSharedJobPostingsIfNeeded(session);

        const remote = await loadPrivateState(session);
        if (cancelled) return;

        if (remote) {
          dispatch({
            type: "LOAD",
            state: loadOnlineStateFromRemote(session, remote),
          });
        } else {
          dispatch({ type: "SET_ONLINE_SESSION", session });
        }

        setBootstrapped(true);
        dispatch({ type: "SET_ONLINE_CONNECTION_STATUS", status: "connected" });
      } catch (err) {
        console.error("Online bootstrap failed", err);
        dispatch({ type: "SET_ONLINE_CONNECTION_STATUS", status: "error" });
      }
    }

    void bootstrap();

    const unsubJobs = subscribeJobPostings(
      session,
      (postings) => {
        dispatch({ type: "SYNC_SHARED_JOBS", jobPostings: postings });

        const now = Date.now();
        for (const posting of postings) {
          if (
            posting.status === "completed" &&
            !handledCompletedRef.current.has(posting.id)
          ) {
            handledCompletedRef.current.add(posting.id);
            dispatch({
              type: "ONLINE_HANDLE_COMPLETED_POSTING",
              postingId: posting.id,
              now,
            });
            if (!handledClosedRef.current.has(`rep-${posting.id}`)) {
              handledClosedRef.current.add(`rep-${posting.id}`);
              void replaceClosedPosting(
                session,
                posting.id,
                posting.definitionId,
                now,
              ).catch((e) => console.error("Replace completed posting failed", e));
            }
          }

          if (
            posting.status === "open" &&
            posting.expiresAt <= now &&
            !handledClosedRef.current.has(`exp-${posting.id}`)
          ) {
            handledClosedRef.current.add(`exp-${posting.id}`);
            void (async () => {
              try {
                await expireSharedPosting(session, posting.id);
                if (!handledClosedRef.current.has(`rep-${posting.id}`)) {
                  handledClosedRef.current.add(`rep-${posting.id}`);
                  await replaceClosedPosting(
                    session,
                    posting.id,
                    posting.definitionId,
                    Date.now(),
                  );
                }
              } catch (e) {
                console.error("Expire shared posting failed", e);
              }
            })();
          }
        }
      },
      (err) => {
        console.error("Job listener error", err);
        dispatch({ type: "SET_ONLINE_CONNECTION_STATUS", status: "error" });
      },
    );

    const unsubCompanies = subscribeCompanies(
      session,
      (presence) => {
        dispatch({ type: "SYNC_COMPANY_PRESENCE", companyPresence: presence });
      },
      (err) => console.error("Company listener error", err),
    );

    const unsubPrivate = subscribePrivateState(
      session,
      (remote) => {
        if (!remote || Date.now() < ignoreRemoteUntilRef.current) return;
        dispatch({
          type: "LOAD",
          state: loadOnlineStateFromRemote(session, remote),
        });
      },
      (err) => console.error("Private state listener error", err),
    );

    return () => {
      cancelled = true;
      setBootstrapped(false);
      unsubJobs();
      unsubCompanies();
      unsubPrivate();
      dispatch({ type: "SET_ONLINE_CONNECTION_STATUS", status: "disconnected" });
    };
  }, [session, enabled, dispatch]);

  useEffect(() => {
    if (!enabled || !bootstrapped) return;
    const id = window.setInterval(() => {
      void flushPendingWork(session, stateRef.current, dispatch);
    }, FLUSH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [session, enabled, dispatch, bootstrapped]);

  useEffect(() => {
    if (!enabled || !bootstrapped) return;
    const id = window.setInterval(() => {
      void upsertCompanyPresence(session, stateRef.current).catch(console.error);
    }, PRESENCE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [session, enabled, bootstrapped]);

  useEffect(() => {
    if (!enabled || !bootstrapped) return;

    const flushPrivate = () => {
      ignoreRemoteUntilRef.current = Date.now() + IGNORE_OWN_REMOTE_MS;
      return savePrivateState(session, stateRef.current).catch((err) => {
        console.error("Private state save failed", err);
        dispatch({ type: "SET_ONLINE_CONNECTION_STATUS", status: "error" });
      });
    };

    const id = window.setTimeout(() => {
      void flushPrivate();
    }, PRIVATE_SAVE_MS);

    const onHide = () => {
      if (document.visibilityState !== "hidden") return;
      void flushPrivate();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);

    return () => {
      window.clearTimeout(id);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [session, enabled, state, dispatch, bootstrapped]);
}

async function flushPendingWork(
  session: OnlineSession,
  state: GameState,
  dispatch: Dispatch<GameAction>,
): Promise<void> {
  const playerId = activePlayerId(state);
  for (const engagement of state.jobEngagements) {
    const pending = engagement.pendingSyncUnitHours ?? 0;
    if (pending <= 0 || engagement.phase !== "working") continue;
    try {
      await flushPostingWorkDelta(
        session,
        engagement.postingId,
        playerId,
        pending,
      );
      dispatch({
        type: "CLEAR_PENDING_SYNC",
        engagementId: engagement.id,
        hours: pending,
      });
    } catch (err) {
      console.error("Flush posting work failed", err);
    }
  }
}

export { resetSharedWorld as resetOnlineSharedWorld } from "../multiplayer/worldSync";
