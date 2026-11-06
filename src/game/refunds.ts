import type { ResourceCost, Resources } from "./types";

/** True when a recruitment order timer has started (first slot actively hiring). */
export function recruitmentJobInProgress(job: {
  completesAt: number | null;
}): boolean {
  return job.completesAt != null;
}

/** Full refund of recorded spend (queued jobs that have not started). */
export function fullRefundFromSpent(spent: ResourceCost): ResourceCost {
  const refund: ResourceCost = {};
  for (const [key, amount] of Object.entries(spent)) {
    const val = amount ?? 0;
    if (val <= 0) continue;
    if (key === "electricity") {
      refund.electricity = val;
    } else {
      refund[key as keyof Resources] = val;
    }
  }
  return refund;
}

/** Recruitment cancel: in-progress 95% (power 100%); queued waiting = full refund. */
export function recruitmentCancelRefund(spent: ResourceCost, job: {
  completesAt: number | null;
}): ResourceCost {
  return recruitmentJobInProgress(job)
    ? cancelRefundFromSpent(spent)
    : fullRefundFromSpent(spent);
}

/** Cancel refund: power 100%, other resources 95% (rounded down). */
export function cancelRefundFromSpent(spent: ResourceCost): ResourceCost {
  const refund: ResourceCost = {};
  for (const [key, amount] of Object.entries(spent)) {
    const val = amount ?? 0;
    if (val <= 0) continue;
    if (key === "electricity") {
      refund.electricity = val;
    } else {
      const k = key as keyof Resources;
      refund[k] = Math.floor(val * 0.95);
    }
  }
  return refund;
}
