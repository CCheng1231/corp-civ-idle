import { formatNumber, OFFICE_LABELS } from "./constants";
import type {
  GameState,
  LogCategory,
  LogEntry,
  OfficeLocationId,
  ResourceCost,
} from "./types";

export const MAX_ACTIVITY_LOG_ENTRIES = 250;

export const LOG_CATEGORY_LABELS: Record<LogCategory, string> = {
  structure_upgrade: "Structure upgrades",
  structure_complete: "Structure upgrades",
  structure_sell: "Structure sells",
  research: "Research",
  recruit: "Recruitment",
  transfer: "Staff relocation",
  transfer_arrival: "Staff relocation",
  bid_start: "Bids",
  bid_complete: "Bids",
  job_engage: "Jobs",
  job_cancel: "Jobs",
  job_complete: "Jobs",
  phase: "Milestones",
};

export const LOG_FILTER_GROUPS: { id: string; label: string; categories: LogCategory[] }[] = [
  { id: "all", label: "All", categories: [] },
  {
    id: "upgrades",
    label: "Upgrades",
    categories: ["structure_upgrade", "structure_complete"],
  },
  { id: "sells", label: "Sells", categories: ["structure_sell"] },
  { id: "research", label: "Research", categories: ["research"] },
  { id: "recruit", label: "Recruitment", categories: ["recruit"] },
  {
    id: "staff",
    label: "Staff travel",
    categories: ["transfer", "transfer_arrival"],
  },
  { id: "bids", label: "Bids", categories: ["bid_start", "bid_complete"] },
  {
    id: "jobs",
    label: "Jobs",
    categories: ["job_engage", "job_cancel", "job_complete"],
  },
  { id: "milestones", label: "Milestones", categories: ["phase"] },
];

export function cloneResourceCost(cost: ResourceCost | undefined): ResourceCost | undefined {
  if (!cost) return undefined;
  const out: ResourceCost = {};
  const keys: (keyof ResourceCost)[] = [
    "cash",
    "supply",
    "connection",
    "mood",
    "reputation",
    "govReputation",
    "electricity",
  ];
  for (const key of keys) {
    const val = cost[key];
    if (val != null && val > 0) out[key] = val;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function pushActivityLog(
  log: LogEntry[],
  entry: Omit<LogEntry, "id" | "at"> & { at?: number },
): LogEntry[] {
  const full: LogEntry = {
    id: `${entry.at ?? Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    at: entry.at ?? Date.now(),
    category: entry.category,
    summary: entry.summary,
    detail: entry.detail,
    officeId: entry.officeId,
    spent: cloneResourceCost(entry.spent),
    gained: cloneResourceCost(entry.gained),
    impacts: entry.impacts,
  };
  return [full, ...log].slice(0, MAX_ACTIVITY_LOG_ENTRIES);
}

export function appendActivityLogs(
  state: GameState,
  entries: Omit<LogEntry, "id" | "at">[],
  at?: number,
): GameState {
  if (entries.length === 0) return state;
  let log = state.activityLog;
  const timestamp = at ?? Date.now();
  for (const entry of entries) {
    log = pushActivityLog(log, { ...entry, at: timestamp });
  }
  return { ...state, activityLog: log };
}

export function formatLogResourceCost(
  cost: ResourceCost | undefined,
  prefix: "spent" | "gained",
): string | null {
  if (!cost) return null;
  const parts: string[] = [];
  for (const [key, value] of Object.entries(cost)) {
    if (!value || value <= 0) continue;
    if (key === "electricity") {
      parts.push(`power ${formatNumber(value)}`);
    } else {
      parts.push(`${key} ${formatNumber(value)}`);
    }
  }
  if (parts.length === 0) return null;
  return prefix === "spent"
    ? `Spent: ${parts.join(" · ")}`
    : `Gained: ${parts.join(" · ")}`;
}

/** Plain cell text for spreadsheet columns (no "Spent:" prefix). */
export function formatLogCostCell(cost: ResourceCost | undefined): string {
  if (!cost) return "—";
  const parts: string[] = [];
  for (const [key, value] of Object.entries(cost)) {
    if (!value || value <= 0) continue;
    if (key === "electricity") {
      parts.push(`power ${formatNumber(value)}`);
    } else {
      parts.push(`${key} ${formatNumber(value)}`);
    }
  }
  return parts.length > 0 ? parts.join(", ") : "—";
}

export function formatLogImpactsCell(impacts: string[] | undefined): string {
  if (!impacts?.length) return "—";
  return impacts.join("; ");
}

export function formatLogTimestamp(at: number): string {
  return new Date(at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Compact time column for spreadsheet rows. */
export function formatLogTimeCell(at: number): string {
  const d = new Date(at);
  const date = d.toLocaleDateString(undefined, {
    month: "2-digit",
    day: "2-digit",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${date} ${time}`;
}

export function officeLabel(officeId: OfficeLocationId | undefined): string {
  if (!officeId) return "";
  return OFFICE_LABELS[officeId];
}
