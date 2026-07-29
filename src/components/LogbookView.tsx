import { useMemo, useState } from "react";
import {
  LOG_CATEGORY_LABELS,
  LOG_FILTER_GROUPS,
  formatLogCostCell,
  formatLogImpactsCell,
  formatLogTimeCell,
  officeLabel,
} from "../game/logbook";
import type { GameState, LogCategory } from "../game/types";

interface LogbookViewProps {
  state: GameState;
}

export function LogbookView({ state }: LogbookViewProps) {
  const [filterId, setFilterId] = useState("all");

  const filtered = useMemo(() => {
    const group = LOG_FILTER_GROUPS.find((g) => g.id === filterId);
    if (!group || group.categories.length === 0) {
      return state.activityLog;
    }
    const allowed = new Set<LogCategory>(group.categories);
    return state.activityLog.filter((entry) => allowed.has(entry.category));
  }, [state.activityLog, filterId]);

  return (
    <div className="logbook-view">
      <header className="logbook-header">
        <h2>Logbook</h2>
        <p className="muted">
          Activity sheet — newest rows first. {state.activityLog.length} entries
          stored.
        </p>
      </header>

      <div className="logbook-filters" role="tablist" aria-label="Log categories">
        {LOG_FILTER_GROUPS.map((group) => (
          <button
            key={group.id}
            type="button"
            role="tab"
            aria-selected={filterId === group.id}
            className={filterId === group.id ? "tab active" : "tab"}
            onClick={() => setFilterId(group.id)}
          >
            {group.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="muted logbook-empty">No entries in this category yet.</p>
      ) : (
        <div className="logbook-sheet-wrap">
          <table className="logbook-sheet">
            <thead>
              <tr>
                <th scope="col" className="col-time">
                  Time
                </th>
                <th scope="col" className="col-category">
                  Category
                </th>
                <th scope="col" className="col-event">
                  Event
                </th>
                <th scope="col" className="col-site">
                  Site
                </th>
                <th scope="col" className="col-spent">
                  Spent
                </th>
                <th scope="col" className="col-gained">
                  Gained
                </th>
                <th scope="col" className="col-effects">
                  Effects
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.id}>
                  <td className="col-time">
                    <time dateTime={new Date(entry.at).toISOString()}>
                      {formatLogTimeCell(entry.at)}
                    </time>
                  </td>
                  <td className="col-category">
                    {LOG_CATEGORY_LABELS[entry.category]}
                  </td>
                  <td className="col-event">
                    <span className="logbook-event-title">{entry.summary}</span>
                    {entry.detail && (
                      <span className="logbook-event-detail">{entry.detail}</span>
                    )}
                  </td>
                  <td className="col-site">
                    {entry.officeId ? officeLabel(entry.officeId) : "—"}
                  </td>
                  <td className="col-spent">{formatLogCostCell(entry.spent)}</td>
                  <td className="col-gained">{formatLogCostCell(entry.gained)}</td>
                  <td className="col-effects">
                    {formatLogImpactsCell(entry.impacts)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted logbook-sheet-foot">
            Showing {filtered.length} row{filtered.length === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </div>
  );
}
