import { getDoc, setDoc } from "firebase/firestore";
import { clearAllOnlineLocalCaches, clearOnlineLocalCache } from "./companySave";
import { playerHqCoord } from "./playerHq";
import type { OnlineSession, PlayerId } from "./types";
import { accountDisplayName, PLAYER_LABELS } from "./types";
import { PLAYER_IDS } from "./types";
import { bumpPlayerResetAt, newSaveSessionId } from "./worldMeta";
import { writeFreshPrivateState } from "./privateSaveSync";
import { resetSharedWorld } from "./sharedJobSync";
import { companyRef, metaRef, privateStateRef } from "./worldDocs";

export async function resetOnlinePlayerAccount(
  session: OnlineSession,
  accountId: string,
): Promise<void> {
  const { resetAt, saveSessionId } = await bumpPlayerResetAt(
    session.worldId,
    accountId,
  );
  await writeFreshPrivateState(session, accountId, resetAt, saveSessionId);
  await setDoc(companyRef(accountId, session.worldId), {
    accountId,
    displayName: accountDisplayName(accountId),
    hqCoord: playerHqCoord(accountId),
    branchSites: [],
    lastSeenAt: Date.now()
});
  clearOnlineLocalCache(accountId, session.worldId);
}

/** Dev: reseed shared job board; keep private saves and map presence. */
export async function resetOnlineSharedWorldPreserveAccounts(
  session: OnlineSession,
): Promise<void> {
  await resetSharedWorld(session);
  await Promise.all(
    PLAYER_IDS.map(async (playerId) => {
      const snap = await getDoc(privateStateRef(playerId, session.worldId));
      if (!snap.exists()) return;
      await setDoc(
        privateStateRef(playerId, session.worldId),
        {
          jobEngagements: [],
          completedPostingPayouts: []
},
        { merge: true },
      );
    }),
  );
}

/** Dev: wipe shared job board + all player saves/presence for this world. */
export async function resetOnlineDatabase(
  session: OnlineSession,
): Promise<void> {
  clearAllOnlineLocalCaches(session.worldId);
  const resetAt = Date.now();
  const saveSessionIds = Object.fromEntries(
    PLAYER_IDS.map((playerId) => [playerId, newSaveSessionId()]),
  ) as Record<PlayerId, string>;
  await setDoc(
    metaRef(session.worldId),
    {
      playerResetAt: {
        tim: resetAt,
        chris: resetAt
},
      playerSaveSessionId: saveSessionIds
},
    { merge: true },
  );
  await Promise.all(
    PLAYER_IDS.map(async (playerId) => {
      await writeFreshPrivateState(
        session,
        playerId,
        resetAt,
        saveSessionIds[playerId],
      );
      await setDoc(companyRef(playerId, session.worldId), {
        accountId: playerId,
        displayName: PLAYER_LABELS[playerId],
        hqCoord: playerHqCoord(playerId),
        branchSites: [],
        lastSeenAt: Date.now()
});
    }),
  );
  await resetSharedWorld(session);
}

