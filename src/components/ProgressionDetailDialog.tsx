import { formatQueueTimeHours } from "../game/timers";
import {
  formatTreeRowCost,
  type ProgressionDetailModel,
  type ProgressionUpgradeTreeRow,
} from "./progressionDetailModel";

interface ProgressionDetailDialogProps extends ProgressionDetailModel {
  onClose: () => void;
}

function TreeRow({ row }: { row: ProgressionUpgradeTreeRow }) {
  const timeLabel =
    row.buildHours > 0 ? formatQueueTimeHours(row.buildHours) : "—";

  return (
    <tr className={`progression-tree-row progression-tree-row--${row.status}`}>
      <td className="progression-tree-lv">{row.level}</td>
      <td className="progression-tree-cost">{formatTreeRowCost(row.cost)}</td>
      <td className="progression-tree-time">{timeLabel}</td>
      <td className="progression-tree-effect">{row.effectSummary}</td>
    </tr>
  );
}

export function ProgressionDetailDialog({
  title,
  description,
  currentLevel,
  projectedLevel,
  maxLevel,
  maxed,
  locked,
  requirement,
  rows,
  onClose,
}: ProgressionDetailDialogProps) {
  const inProgress = projectedLevel > currentLevel;
  const levelMax = maxLevel > 1 ? ` / max ${maxLevel}` : "";

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal progression-detail-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="progression-detail-title"
      >
        <header className="modal-header progression-detail-header">
          <div>
            <h2 id="progression-detail-title">{title}</h2>
            <p className="progression-detail-level">
              Current: Lv {currentLevel}
              {levelMax}
              {inProgress ? (
                <span className="progression-detail-queued">
                  {" "}
                  · Queued to Lv {projectedLevel}
                </span>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            className="tab progression-detail-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        {description ? (
          <p className="structure-desc muted progression-detail-desc">
            {description}
          </p>
        ) : null}

        {locked && requirement ? (
          <p className="structure-blocker progression-detail-requirement">
            Requires: {requirement}
          </p>
        ) : null}

        {maxed ? (
          <p className="progression-detail-status muted">Maxed</p>
        ) : null}

        <section className="progression-tree-section">
          <h3 className="progression-detail-section-title">Upgrade path</h3>
          <div className="progression-tree-scroll">
            <table className="progression-tree-table">
              <thead>
                <tr>
                  <th>Lv</th>
                  <th>Cost</th>
                  <th>Time</th>
                  <th>At this level</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <TreeRow key={row.level} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="progression-detail-actions">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

export type { ProgressionDetailModel } from "./progressionDetailModel";
