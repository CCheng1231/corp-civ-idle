import type { ResourceCost, Resources } from "./types";

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
