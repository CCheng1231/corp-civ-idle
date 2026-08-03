import { rosterAt, totalWorkforce } from "./constants";
import type { GameState, LogEntry } from "./types";
import { activeEngagementCount, maxJobEngagements } from "./jobs";
import { openJobPostings } from "./jobBoard";
import { formatLogCostCell } from "./logbook";

export const SECRETARY_QUOTES = [
  "Synergy is just teamwork with a slide deck.",
  "The market rewards patience — and aggressive invoicing.",
  "If you're not growing, you're depreciating.",
  "Every crisis is a branding opportunity in disguise.",
  "Cash flow is opinion; payroll is fact.",
  "Delegate the work. Keep the credit.",
  "A clear desk is a sign of an empty pipeline.",
  "Win the quarter, then explain the quarter after.",
  "Under-promise in meetings. Over-deliver in spreadsheets.",
  "The best ROI is the task you finish before lunch.",
  "Competitors copy strategy. They can't copy your overtime budget.",
  "Momentum beats perfection — especially before the board call.",
  "Your calendar is a strategy document. Guard it like cap table.",
  "Revenue solves most problems. The rest need better PR.",
  "Close one deal today. Worry about the forecast tomorrow.",
];

export function secretaryQuote(state: GameState): string {
  const day = Math.floor(Date.now() / 86_400_000);
  const index =
    (day + state.completedProjects * 7 + state.jobEngagements.length * 3) %
    SECRETARY_QUOTES.length;
  return SECRETARY_QUOTES[index];
}

export function secretaryTips(state: GameState): string[] {
  const tips: string[] = [];
  const officeId = state.selectedOffice;
  const activeJobs = activeEngagementCount(state);
  const jobCap = maxJobEngagements(state);
  const staff = totalWorkforce(rosterAt(state, officeId));
  const openPostings = openJobPostings(state).length;

  if (activeJobs < jobCap) {
    tips.push(
      `${jobCap - activeJobs} job slot${jobCap - activeJobs === 1 ? "" : "s"} open — browse the board below and engage before postings expire.`,
    );
  } else {
    tips.push("Job cap is full. Wait for crews to return or cancel an engagement.");
  }

  if (staff <= 0) {
    tips.push("No units at the selected office — hire on the Recruitment tab before taking contracts.");
  } else if (activeJobs === 0) {
    tips.push("Assign units on a posting card, then hit Engage. Tier 1 jobs show full payout rates.");
  }

  if (openPostings > 0) {
    tips.push(
      `${openPostings} posting${openPostings === 1 ? "" : "s"} live region-wide — filter by tower, tier, or expiration.`,
    );
  }

  if (staff > 0 && activeJobs > 0 && activeJobs < jobCap) {
    tips.push("You can run multiple shifts at once if you have spare units and open slots.");
  }

  if (tips.length === 0) {
    tips.push("Keep the pipeline full — sort by expiration to catch deals before they lapse.");
  }

  return tips.slice(0, 4);
}

export function secretaryJobSummary(state: GameState): {
  active: number;
  cap: number;
} {
  return {
    active: activeEngagementCount(state),
    cap: maxJobEngagements(state),
  };
}

const MAX_JOB_REPORTS = 5;

/** Undismissed job log entries for the Secretary FYI box. */
export function pendingJobReports(state: GameState): LogEntry[] {
  const dismissed = new Set(state.dismissedJobReportIds ?? []);
  return state.activityLog
    .filter(
      (entry) =>
        (entry.category === "job_complete" || entry.category === "job_cancel") &&
        !dismissed.has(entry.id),
    )
    .slice(0, MAX_JOB_REPORTS);
}

/** @deprecated Use pendingJobReports */
export function pendingJobCompletionReports(state: GameState): LogEntry[] {
  return pendingJobReports(state);
}

export function jobReportBrief(entry: LogEntry): string {
  const gained = formatLogCostCell(entry.gained);
  if (gained !== "—") {
    if (entry.category === "job_cancel") {
      return `Partial payout — earned ${gained}.`;
    }
    return `Earned ${gained}.`;
  }
  const impact = entry.impacts?.[0];
  return impact ?? "Crew returned to office.";
}

export function jobReportKindLabel(entry: LogEntry): string {
  if (entry.category === "job_cancel") return "Withdrawn";
  return "Completed";
}

function jobReportDetail(entry: LogEntry): string {
  return entry.summary
    .replace(/^Units returned from /i, "returned from ")
    .replace(/^Units returned — job completed: /i, "completed: ");
}

/** Line 1: kind + short event title. */
export function jobReportHeadline(entry: LogEntry): string {
  return `${jobReportKindLabel(entry)} - ${jobReportDetail(entry)}`;
}
