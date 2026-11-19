import type { ReactNode } from "react";

interface CompactQueueHeadingProps {
  id?: string;
  title: string;
  count: ReactNode;
  countAriaLabel: string;
  hideLabel?: string;
  hideChecked?: boolean;
  onHideChange?: (checked: boolean) => void;
}

export function CompactQueueHeading({
  id,
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

  const countBadge = (
    <span className="tab-queue-count muted" aria-label={countAriaLabel}>
      {count}
    </span>
  );

  if (!showHide) {
    return (
      <div id={id} className="tab-queue-heading">
        <h3>{title}</h3>
        {countBadge}
      </div>
    );
  }

  return (
    <div id={id} className="tab-queue-heading tab-queue-heading-stacked">
      <h3>{title}</h3>
      <div className="tab-queue-heading-meta">
        {countBadge}
        <label className="progression-hide-completed-check tab-queue-filter">
          <input
            type="checkbox"
            checked={hideChecked}
            onChange={(event) => onHideChange(event.target.checked)}
          />
          {hideLabel}
        </label>
      </div>
    </div>
  );
}
