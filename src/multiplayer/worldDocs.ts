import { collection, doc } from "firebase/firestore";
import { getDb } from "./firebase";
import type { WorldId } from "./types";

export const WORLD_ID: WorldId = "dev";

export function worldRoot(worldId: WorldId = WORLD_ID) {
  return doc(getDb(), "worlds", worldId);
}

export function metaRef(worldId: WorldId = WORLD_ID) {
  return doc(getDb(), "worlds", worldId, "meta", "world");
}

export function jobPostingsCol(worldId: WorldId = WORLD_ID) {
  return collection(getDb(), "worlds", worldId, "jobPostings");
}

export function companyRef(accountId: string, worldId: WorldId = WORLD_ID) {
  return doc(getDb(), "worlds", worldId, "companies", accountId);
}

export function privateStateRef(accountId: string, worldId: WorldId = WORLD_ID) {
  return doc(
    getDb(),
    "worlds",
    worldId,
    "companies",
    accountId,
    "private",
    "state",
  );
}

export function companiesCol(worldId: WorldId = WORLD_ID) {
  return collection(getDb(), "worlds", worldId, "companies");
}
