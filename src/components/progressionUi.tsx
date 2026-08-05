import { type ReactNode } from "react";

interface ProgressionCategorySectionProps {
  title: string;
  /** Open when any item still needs attention. */
  defaultOpen: boolean;
  maxedCount: number;
  totalCount: number;
  children: ReactNode;
}

export function ProgressionCategorySection({
  title,
  defaultOpen,
  maxedCount,
  totalCount,
  children,
}: ProgressionCategorySectionProps) {
  const allMaxed = totalCount > 0 && maxedCount === totalCount;

  return (
    <details
      className="progression-category-section research-type-section"
      open={defaultOpen}
    >
      <summary className="progression-category-summary research-type-heading">
        {title}
        {allMaxed ? (
          <span className="progression-category-meta"> · {totalCount} maxed</span>
        ) : null}
      </summary>
      {children}
    </details>
  );
}

interface ProgressionMaxedCardProps {
  name: string;
  levelLabel: string;
  compactBonus: string;
  children: ReactNode;
}

export function ProgressionMaxedCard({
  name,
  levelLabel,
  compactBonus,
  children,
}: ProgressionMaxedCardProps) {
  return (
    <details className="progression-maxed-details">
      <summary className="progression-maxed-summary">
        <span className="progression-maxed-summary-main">
          <strong>{name}</strong>
          <span className="progression-maxed-level">{levelLabel}</span>
        </span>
        {compactBonus ? (
          <span className="progression-maxed-bonus">{compactBonus}</span>
        ) : null}
      </summary>
      <div className="progression-maxed-body">{children}</div>
    </details>
  );
}
