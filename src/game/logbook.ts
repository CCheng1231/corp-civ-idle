import { formatNumber, OFFICE_LABELS, resourceCostParts } from "./constants";
import type {
  GameState,
  LogCategory,
  LogEntry,
  OfficeLocationId,
  ResourceCost,
} from "./types";

export const MAX_ACTIVITY_LOG_ENTRIES = 250;
export const MAX_SECRETARY_JOB_REPORTS = 20;

export const LOG_CATEGORY_LABELS: Record<LogCategory, string> = {
  structure_upgrade: "Structure upgrades",
  structure_complete: "Structure upgrades",
  structure_sell: "Structure sells",
  structure_cancel: "Structure cancels",
  research: "Research",
  research_complete: "Research",
  research_cancel: "Research cancels",
  recruit: "Recruitment",
  recruit_cancel: "Recruitment cancels",
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
    categories: ["structure_upgrade", "structure_complete", "structure_cancel"],
  },
  { id: "sells", label: "Sells", categories: ["structure_sell"] },
  { id: "research", label: "Research", categories: ["research", "research_complete", "research_cancel"] },
  { id: "recruit", label: "Recruitment", categories: ["recruit", "recruit_cancel"] },
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
  {
    id: "cancels",
    label: "Cancels",
    categories: ["structure_cancel", "research_cancel", "recruit_cancel", "job_cancel"],
  },
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

/** Pre-return payout rows — secretary waits for the crew-back report. */
export function isPreReturnJobLog(entry: LogEntry): boolean {
  return (
    /^Shift complete:/i.test(entry.summary) ||
    /^Job completed:/i.test(entry.summary) ||
    /^Withdrawn from .+ \((early|posting expired)\)$/i.test(entry.summary)
  );
}

/** Secretary FYI rows (crew returned summaries, not pre-return payout lines). */
export function isSecretaryJobReportEntry(
  entry: Pick<LogEntry, "category" | "summary">,
): boolean {
  return (
    (entry.category === "job_complete" || entry.category === "job_cancel") &&
    !isPreReturnJobLog(entry as LogEntry)
  );
}

/** Undismissed secretary job reports, newest first (activity log order). */
export function pendingJobReportEntries(state: GameState): LogEntry[] {
  const dismissed = new Set(state.dismissedJobReportIds ?? []);
  return state.activityLog.filter(
    (entry) => isSecretaryJobReportEntry(entry) && !dismissed.has(entry.id),
  );
}

/** Auto-dismiss oldest reports when the undismissed queue exceeds the cap. */
export function trimSecretaryJobReports(
  state: GameState,
  cap = MAX_SECRETARY_JOB_REPORTS,
): GameState {
  const pending = pendingJobReportEntries(state);
  if (pending.length <= cap) return state;
  const dismissed = new Set(state.dismissedJobReportIds ?? []);
  for (const entry of pending.slice(cap)) {
    dismissed.add(entry.id);
  }
  return { ...state, dismissedJobReportIds: [...dismissed] };
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
  let next: GameState = { ...state, activityLog: log };
  if (entries.some((entry) => isSecretaryJobReportEntry(entry))) {
    next = trimSecretaryJobReports(next);
  }
  return next;
}

export function formatLogResourceCost(
  cost: ResourceCost | undefined,
  prefix: "spent" | "gained",
): string | null {
  if (!cost) return null;
  const text = formatLogCostCell(cost);
  if (text === "—") return null;
  return prefix === "spent" ? `Spent: ${text}` : `Gained: ${text}`;
}

/** Plain cell text for spreadsheet columns (no "Spent:" prefix). */
export function formatLogCostCell(cost: ResourceCost | undefined): string {
  if (!cost) return "—";
  const parts = resourceCostParts(cost);
  if (parts.length === 0) return "—";
  return parts.map((part) => `${part.label} ${formatNumber(part.amount)}`).join(", ");
}

/** Log fields for queue cancel — mirrors upgrade rows (spent + gained columns). */
export function queueCancelLogFields(
  spent: ResourceCost,
  refund: ResourceCost,
): Pick<LogEntry, "spent" | "gained" | "impacts"> {
  const gainedText = formatLogCostCell(refund);
  return {
    spent: cloneResourceCost(spent),
    gained: cloneResourceCost(refund),
    impacts: [
      "Removed from queue",
      gainedText !== "—"
        ? `Refunded ${gainedText}`
        : "No resources refunded",
      "Power 100%; other resources 95% (rounded down)",
    ],
  };
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
