import { useEffect, useRef, useState, type Dispatch } from "react";
import type { GameAction, GameState } from "../game/types";
import type { OnlineSession } from "../multiplayer/types";
import { activePlayerId } from "../multiplayer/playerHq";
import { isFirebaseConfigured } from "../multiplayer/firebase";
import {
  ensureWorldBootstrapped,
  authorizeOnlineSaveState,
  patchRemoteSaveAuthFields,
  flushPostingWorkDelta,
  isPrivateStateStale,
  loadPrivateState,
  loadWorldMeta,
  OnlineSaveRejectedError,
  playerResetTimestamp,
  playerSaveSessionId,
  repairPrivateStateIfStale,
  remoteResetGeneration,
  replaceClosedPosting,
  expireSharedPosting,
  savePrivateState,
  seedSharedJobPostingsIfNeeded,
  subscribeCompanies,
  subscribeJobPostings,
  subscribePrivateState,
  repairStaleCompanyPresences,
  upsertCompanyPresence,
} from "../multiplayer/worldSync";
import {
  loadOnlineStateFromRemote,
} from "../game/save";
import { clearOnlineLocalCache } from "../multiplayer/companySave";
import { getDb } from "../multiplayer/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import type { WorldMeta } from "../multiplayer/types";

function metaDocRef(worldId: OnlineSession["worldId"]) {
  return doc(getDb(), "worlds", worldId, "meta", "world");
}

async function resolveOnlineLoadState(
  session: OnlineSession,
  resetAt: number,
  expectedSessionId?: string,
): Promise<GameState> {
  return repairPrivateStateIfStale(session, resetAt, expectedSessionId);
}

const FLUSH_INTERVAL_MS = 5000;

const PRESENCE_INTERVAL_MS = 15000;
const PRIVATE_SAVE_INTERVAL_MS = 5000;
const IGNORE_OWN_REMOTE_MS = 3000;
const JOB_MAINTENANCE_DELAY_MS = 4000;

function remoteUpdatedAt(remote: Record<string, unknown>): number {
  return Number(remote.updatedAt ?? 0);
}

function applyLoadedOnlineState(
  loaded: GameState,
  stateRef: { current: GameState },
  dispatch: Dispatch<GameAction>,
): void {
  stateRef.current = loaded;
  dispatch({ type: "LOAD", state: loaded });
}

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
  const lastLocalSaveAtRef = useRef(0);
  const lastAppliedRemoteAtRef = useRef(0);
  const lastAckResetAtRef = useRef(0);
  const lastExpectedSessionIdRef = useRef<string | undefined>(undefined);
  const bootstrapCompleteRef = useRef(false);
  const bootstrapSaveReadyRef = useRef(false);
  const jobMaintenanceReadyRef = useRef(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    if (!enabled || !isFirebaseConfigured()) return;

    let cancelled = false;
    bootstrapCompleteRef.current = false;
    bootstrapSaveReadyRef.current = false;
    jobMaintenanceReadyRef.current = false;
    const jobMaintenanceTimer = window.setTimeout(() => {
      jobMaintenanceReadyRef.current = true;
    }, JOB_MAINTENANCE_DELAY_MS);

    dispatch({ type: "SET_ONLINE_CONNECTION_STATUS", status: "connecting" });

    dispatch({ type: "SET_ONLINE_SESSION", session });

    async function bootstrap() {
      try {
        clearOnlineLocalCache(session.playerId, session.worldId);
        await ensureWorldBootstrapped(session);
        const meta = await loadWorldMeta(session);
        const resetAt = playerResetTimestamp(meta, session.playerId);
        const expectedSessionId = playerSaveSessionId(meta, session.playerId);
        lastAckResetAtRef.current = resetAt;
        lastExpectedSessionIdRef.current = expectedSessionId;

        await seedSharedJobPostingsIfNeeded(session);

        let remote = await loadPrivateState(session);
        if (cancelled) return;

        if (remote) {
          remote = await patchRemoteSaveAuthFields(
            session,
            remote,
            resetAt,
            expectedSessionId,
          );
        }

        let loaded: GameState;
        if (
          !remote ||
          isPrivateStateStale(remote, resetAt, expectedSessionId)
        ) {
          loaded = await repairPrivateStateIfStale(
            session,
            resetAt,
            expectedSessionId,
          );
          if (cancelled) return;
          lastAppliedRemoteAtRef.current = resetAt > 0 ? resetAt : 0;
        } else {
          try {
            lastAppliedRemoteAtRef.current = remoteUpdatedAt(remote);
            loaded = loadOnlineStateFromRemote(
              session,
              remote,
              resetAt,
              expectedSessionId,
            );
          } catch (err) {
            console.warn(
              "Online save deserialize failed — repairing from Firestore",
              err,
            );
            clearOnlineLocalCache(session.playerId, session.worldId);
            loaded = await repairPrivateStateIfStale(
              session,
              resetAt,
              expectedSessionId,
            );
            lastAppliedRemoteAtRef.current = resetAt > 0 ? resetAt : 0;
          }
        }

        const authorized = authorizeOnlineSaveState(
          loaded,
          resetAt,
          expectedSessionId ?? loaded.onlineSaveSessionId,
        );
        lastExpectedSessionIdRef.current = authorized.onlineSaveSessionId;
        applyLoadedOnlineState(authorized, stateRef, dispatch);

        if (remote && !isPrivateStateStale(remote, resetAt, expectedSessionId)) {
          const syncedAt = Date.now();
          lastLocalSaveAtRef.current = syncedAt;
          lastAppliedRemoteAtRef.current = syncedAt;
          ignoreRemoteUntilRef.current = syncedAt + IGNORE_OWN_REMOTE_MS;
          try {
            const saved = await savePrivateState(session, authorized, syncedAt);
            stateRef.current = authorizeOnlineSaveState(
              {
                ...stateRef.current,
                onlineResetGeneration: saved.generation,
              },
              resetAt,
              expectedSessionId ?? authorized.onlineSaveSessionId,
            );
          } catch {
            /* periodic flush will retry */
          }
        }

        bootstrapCompleteRef.current = true;
        bootstrapSaveReadyRef.current = true;
        setBootstrapped(true);
        dispatch({ type: "SET_ONLINE_CONNECTION_STATUS", status: "connected" });
        void repairStaleCompanyPresences(session.worldId).catch((err) =>
          console.error("Repair stale company presences failed", err),
        );
        void upsertCompanyPresence(session, stateRef.current).catch((err) =>
          console.error("Initial company presence upsert failed", err),
        );
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

        if (!jobMaintenanceReadyRef.current) return;

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
        if (!remote || !bootstrapCompleteRef.current) return;

        const resetAt = lastAckResetAtRef.current;
        const expectedSessionId = lastExpectedSessionIdRef.current;
        const remoteGen = remoteResetGeneration(remote);
        if (remoteGen > resetAt) {
          lastAckResetAtRef.current = remoteGen;
          lastAppliedRemoteAtRef.current = remoteUpdatedAt(remote);
          lastLocalSaveAtRef.current = 0;
          ignoreRemoteUntilRef.current = Date.now() + IGNORE_OWN_REMOTE_MS;
          try {
            const loaded = loadOnlineStateFromRemote(
              session,
              remote,
              remoteGen,
              expectedSessionId,
            );
            lastExpectedSessionIdRef.current = loaded.onlineSaveSessionId;
            applyLoadedOnlineState(loaded, stateRef, dispatch);
          } catch (err) {
            console.error("Remote reset generation apply failed", err);
          }
          return;
        }

        if (Date.now() < ignoreRemoteUntilRef.current) return;
        if (isPrivateStateStale(remote, resetAt, expectedSessionId)) return;

        const remoteAt = remoteUpdatedAt(remote);
        if (remoteAt <= lastAppliedRemoteAtRef.current) return;
        if (remoteAt <= lastLocalSaveAtRef.current) return;

        try {
          lastAppliedRemoteAtRef.current = remoteAt;
          const loaded = loadOnlineStateFromRemote(
            session,
            remote,
            resetAt,
            expectedSessionId,
          );
          lastExpectedSessionIdRef.current = loaded.onlineSaveSessionId;
          applyLoadedOnlineState(loaded, stateRef, dispatch);
        } catch (err) {
          console.error("Remote private state update rejected", err);
        }
      },
      (err) => console.error("Private state listener error", err),
    );

    const unsubMeta = onSnapshot(
      metaDocRef(session.worldId),
      (snap) => {
        if (!bootstrapCompleteRef.current) return;

        const meta = snap.exists() ? (snap.data() as WorldMeta) : undefined;
        const resetAt = playerResetTimestamp(meta, session.playerId);
        const expectedSessionId = playerSaveSessionId(meta, session.playerId);
        if (resetAt <= lastAckResetAtRef.current) return;
        lastAckResetAtRef.current = resetAt;
        lastExpectedSessionIdRef.current = expectedSessionId;
        lastLocalSaveAtRef.current = 0;
        lastAppliedRemoteAtRef.current = 0;
        ignoreRemoteUntilRef.current = Date.now() + IGNORE_OWN_REMOTE_MS;
        clearOnlineLocalCache(session.playerId, session.worldId);
        void resolveOnlineLoadState(session, resetAt, expectedSessionId).then(
          (loaded) => {
            lastExpectedSessionIdRef.current = loaded.onlineSaveSessionId;
            applyLoadedOnlineState(loaded, stateRef, dispatch);
          },
        );
      },
      (err) => console.error("World meta listener error", err),
    );

    return () => {
      cancelled = true;
      bootstrapCompleteRef.current = false;
      bootstrapSaveReadyRef.current = false;
      window.clearTimeout(jobMaintenanceTimer);
      setBootstrapped(false);
      unsubJobs();
      unsubCompanies();
      unsubPrivate();
      unsubMeta();
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

    const pushPresence = () => {
      void upsertCompanyPresence(session, stateRef.current).catch((err) =>
        console.error("Company presence upsert failed", err),
      );
    };

    pushPresence();
    const id = window.setInterval(pushPresence, PRESENCE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [session, enabled, bootstrapped]);

  useEffect(() => {
    if (!enabled || !bootstrapped) return;

    const flushPrivate = () => {
      if (!bootstrapSaveReadyRef.current) return;

      void (async () => {
        const meta = await loadWorldMeta(session);
        const resetAt = playerResetTimestamp(meta, session.playerId);
        const expectedSessionId = playerSaveSessionId(meta, session.playerId);
        if (resetAt > lastAckResetAtRef.current) {
          lastAckResetAtRef.current = resetAt;
          lastExpectedSessionIdRef.current = expectedSessionId;
          lastLocalSaveAtRef.current = 0;
          lastAppliedRemoteAtRef.current = 0;
          ignoreRemoteUntilRef.current = Date.now() + IGNORE_OWN_REMOTE_MS;
          clearOnlineLocalCache(session.playerId, session.worldId);
          const loaded = await resolveOnlineLoadState(
            session,
            resetAt,
            expectedSessionId,
          );
          lastExpectedSessionIdRef.current = loaded.onlineSaveSessionId;
          applyLoadedOnlineState(loaded, stateRef, dispatch);
          return;
        }

        const localGeneration = stateRef.current.onlineResetGeneration ?? 0;
        const localSessionId = stateRef.current.onlineSaveSessionId;
        if (resetAt > 0 && localGeneration < resetAt) {
          lastAckResetAtRef.current = Math.max(
            lastAckResetAtRef.current,
            resetAt,
          );
          lastLocalSaveAtRef.current = 0;
          lastAppliedRemoteAtRef.current = 0;
          ignoreRemoteUntilRef.current = Date.now() + IGNORE_OWN_REMOTE_MS;
          const loaded = await resolveOnlineLoadState(
            session,
            resetAt,
            expectedSessionId,
          );
          lastExpectedSessionIdRef.current = loaded.onlineSaveSessionId;
          applyLoadedOnlineState(loaded, stateRef, dispatch);
          return;
        }

        if (
          expectedSessionId &&
          localSessionId !== expectedSessionId
        ) {
          if (localGeneration >= resetAt) {
            stateRef.current = {
              ...stateRef.current,
              onlineSaveSessionId: expectedSessionId,
            };
            dispatch({
              type: "SET_ONLINE_SAVE_SESSION",
              sessionId: expectedSessionId,
            });
          } else {
            lastLocalSaveAtRef.current = 0;
            lastAppliedRemoteAtRef.current = 0;
            ignoreRemoteUntilRef.current = Date.now() + IGNORE_OWN_REMOTE_MS;
            clearOnlineLocalCache(session.playerId, session.worldId);
            const loaded = await resolveOnlineLoadState(
              session,
              resetAt,
              expectedSessionId,
            );
            lastExpectedSessionIdRef.current = loaded.onlineSaveSessionId;
            applyLoadedOnlineState(loaded, stateRef, dispatch);
            return;
          }
        }

        const snapshot = authorizeOnlineSaveState(
          stateRef.current,
          resetAt,
          expectedSessionId,
        );

        const updatedAt = Date.now();
        ignoreRemoteUntilRef.current = updatedAt + IGNORE_OWN_REMOTE_MS;
        lastLocalSaveAtRef.current = updatedAt;
        try {
          const saved = await savePrivateState(session, snapshot, updatedAt);
          const authorized = authorizeOnlineSaveState(
            {
              ...stateRef.current,
              onlineResetGeneration: saved.generation,
            },
            resetAt,
            expectedSessionId,
          );
          stateRef.current = authorized;
          dispatch({
            type: "SET_ONLINE_RESET_GENERATION",
            generation: saved.generation,
          });
          if (expectedSessionId) {
            dispatch({
              type: "SET_ONLINE_SAVE_SESSION",
              sessionId: expectedSessionId,
            });
          }
        } catch (err) {
          if (err instanceof OnlineSaveRejectedError) {
            lastAckResetAtRef.current = err.requiredGeneration;
            lastExpectedSessionIdRef.current = expectedSessionId;
            lastLocalSaveAtRef.current = 0;
            lastAppliedRemoteAtRef.current = 0;
            ignoreRemoteUntilRef.current = Date.now() + IGNORE_OWN_REMOTE_MS;
            clearOnlineLocalCache(session.playerId, session.worldId);
            const loaded = await resolveOnlineLoadState(
              session,
              err.requiredGeneration,
              expectedSessionId,
            );
            lastExpectedSessionIdRef.current = loaded.onlineSaveSessionId;
            applyLoadedOnlineState(loaded, stateRef, dispatch);
            return;
          }
          console.error("Private state save failed", err);
          dispatch({ type: "SET_ONLINE_CONNECTION_STATUS", status: "error" });
        }
      })();
    };

    void flushPrivate();
    const id = window.setInterval(() => {
      void flushPrivate();
    }, PRIVATE_SAVE_INTERVAL_MS);

    const onHide = () => {
      if (document.visibilityState !== "hidden") return;
      void flushPrivate();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [session, enabled, dispatch, bootstrapped]);
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
