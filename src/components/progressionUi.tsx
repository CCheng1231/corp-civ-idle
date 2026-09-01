import { type ReactNode } from "react";

interface ProgressionCategorySectionProps {
  title: string;
  /** Open when any item still needs attention. */
  defaultOpen: boolean;
  /** When set, the section is controlled (survives remount via parent state). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  maxedCount: number;
  totalCount: number;
  banner?: ReactNode;
  children: ReactNode;
}

export function ProgressionCategorySection({
  title,
  defaultOpen,
  open,
  onOpenChange,
  maxedCount,
  totalCount,
  banner,
  children,
}: ProgressionCategorySectionProps) {
  const allMaxed = totalCount > 0 && maxedCount === totalCount;
  const controlled = open !== undefined;

  return (
    <details
      className="progression-category-section research-type-section"
      open={controlled ? open : undefined}
      defaultOpen={controlled ? undefined : defaultOpen}
      onToggle={
        onOpenChange
          ? (event) => {
              onOpenChange(event.currentTarget.open);
            }
          : undefined
      }
    >
      <summary className="progression-category-summary research-type-heading">
        {title}
        {allMaxed ? (
          <span className="progression-category-meta"> · {totalCount} maxed</span>
        ) : null}
      </summary>
      {banner}
      {children}
      <button
        type="button"
        className="office-collapse-all"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (onOpenChange) {
            onOpenChange(false);
            return;
          }
          const section = event.currentTarget.closest("details");
          if (section) section.open = false;
        }}
      >
        {"<< Collapse"}
      </button>
    </details>
  );
}

interface ProgressionMaxedCardProps {
  name: string;
  levelLabel: string;
  compactBonus: string;
  onNameClick?: () => void;
  children: ReactNode;
}

export function ProgressionNameButton({
  name,
  onClick,
}: {
  name: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="progression-name-btn"
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onClick();
      }}
    >
      {name}
    </button>
  );
}

export function ProgressionMaxedCard({
  name,
  levelLabel,
  compactBonus,
  onNameClick,
  children,
}: ProgressionMaxedCardProps) {
  return (
    <details className="progression-maxed-details">
      <summary className="progression-maxed-summary">
        <span className="progression-maxed-summary-main">
          {onNameClick ? (
            <ProgressionNameButton name={name} onClick={onNameClick} />
          ) : (
            <strong>{name}</strong>
          )}
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
