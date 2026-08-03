import {
  canAffordCostPart,
  formatNumber,
  resourceCostParts,
} from "../game/constants";
import type { GameState, OfficeLocationId, ResourceCost } from "../game/types";
import { CompactStack, formatCompactCost } from "./CompactStack";

interface StructureCostLineProps {
  state: GameState;
  officeId: OfficeLocationId;
  cost: ResourceCost;
  prefix?: string;
  inline?: boolean;
  layout?: "line" | "stack";
  heading?: string;
  note?: string;
  className?: string;
}

export function StructureCostLine({
  state,
  officeId,
  cost,
  prefix = "Cost:",
  inline = false,
  layout = "line",
  heading = "Cost",
  note,
  className = "",
}: StructureCostLineProps) {
  const parts = resourceCostParts(cost);
  if (parts.length === 0) return null;

  if (layout === "stack") {
    return (
      <CompactStack
        heading={heading}
        className={className}
        note={note}
        lines={parts.map((part) => ({
          label: part.label,
          value: formatCompactCost(part.amount),
          valueClassName: canAffordCostPart(state, officeId, part)
            ? "structure-cost-affordable"
            : "structure-cost-unaffordable",
        }))}
      />
    );
  }

  const Tag = inline ? "span" : "div";

  return (
    <Tag className={["structure-cost-primary", className].filter(Boolean).join(" ")}>
      {prefix ? (
        <>
          <span className="structure-cost-label">{prefix}</span>{" "}
        </>
      ) : null}
      {parts.map((part, index) => (
        <span key={part.key} className="structure-cost-part">
          {index > 0 && <span className="structure-cost-sep"> · </span>}
          <span className="structure-cost-part-label">{part.label} </span>
          <span
            className={
              canAffordCostPart(state, officeId, part)
                ? "structure-cost-affordable"
                : "structure-cost-unaffordable"
            }
          >
            {formatNumber(part.amount)}
          </span>
        </span>
      ))}
    </Tag>
  );
}
