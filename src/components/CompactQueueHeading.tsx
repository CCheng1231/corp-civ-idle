import type { ReactNode } from "react";

interface CompactQueueHeadingProps {
  title: string;
  count: ReactNode;
  countAriaLabel: string;
  hideLabel?: string;
  hideChecked?: boolean;
  onHideChange?: (checked: boolean) => void;
}

export function CompactQueueHeading({
  title,
  count,
  countAriaLabel,
  hideLabel,
  hideChecked,
  onHideChange,
}: CompactQueueHeadingProps) {
  const showHide =
    hideLabel !== undefined &&
    hideChecked !== undefined &&
    onHideChange !== undefined;

  return (
    <div className="tab-queue-heading tab-queue-heading-stacked">
      <h3>{title}</h3>
      <div className="tab-queue-heading-meta">
        <span className="tab-queue-count muted" aria-label={countAriaLabel}>
          {count}
        </span>
        {showHide ? (
          <label className="progression-hide-completed-check tab-queue-filter">
            <input
              type="checkbox"
              checked={hideChecked}
              onChange={(event) => onHideChange(event.target.checked)}
            />
            {hideLabel}
          </label>
        ) : null}
      </div>
    </div>
  );
}
