import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch } from "react";
import {
  LOG_CATEGORY_LABELS,
  LOG_FILTER_GROUPS,
  formatLogCostCell,
  formatLogImpactsCell,
  formatLogTimeCell,
  officeLabel,
} from "../game/logbook";
import type { GameAction, GameState, LogCategory } from "../game/types";

const LOGBOOK_COL_STORAGE_KEY = "corp-civ-idle-logbook-col-widths";

const LOGBOOK_COLUMNS = [
  { id: "time", label: "Time" },
  { id: "category", label: "Category" },
  { id: "event", label: "Event" },
  { id: "site", label: "Site" },
  { id: "spent", label: "Spent" },
  { id: "gained", label: "Gained" },
  { id: "effects", label: "Effects" },
] as const;

type LogbookColumnId = (typeof LOGBOOK_COLUMNS)[number]["id"];

const DEFAULT_COL_WIDTHS: Record<LogbookColumnId, number> = {
  time: 118,
  category: 108,
  event: 240,
  site: 72,
  spent: 112,
  gained: 112,
  effects: 220,
};

const MIN_COL_WIDTH = 56;

function loadColumnWidths(): Record<LogbookColumnId, number> {
  try {
    const raw = localStorage.getItem(LOGBOOK_COL_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_COL_WIDTHS };
    const parsed = JSON.parse(raw) as Partial<Record<LogbookColumnId, number>>;
    const next = { ...DEFAULT_COL_WIDTHS };
    for (const col of LOGBOOK_COLUMNS) {
      const val = parsed[col.id];
      if (typeof val === "number" && val >= MIN_COL_WIDTH) {
        next[col.id] = val;
      }
    }
    return next;
  } catch {
    return { ...DEFAULT_COL_WIDTHS };
  }
}

interface LogbookViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function LogbookView({ state, dispatch }: LogbookViewProps) {
  const filterId = state.logbookFilterId;
  const highlightId = state.logbookHighlightEntryId ?? null;
  const [colWidths, setColWidths] = useState(loadColumnWidths);
  const resizeRef = useRef<{
    columnId: LogbookColumnId;
    startX: number;
    startWidth: number;
  } | null>(null);

  const filtered = useMemo(() => {
    const group = LOG_FILTER_GROUPS.find((g) => g.id === filterId);
    if (!group || group.categories.length === 0) {
      return state.activityLog;
    }
    const allowed = new Set<LogCategory>(group.categories);
    return state.activityLog.filter((entry) => allowed.has(entry.category));
  }, [state.activityLog, filterId]);

  const persistWidths = useCallback((widths: Record<LogbookColumnId, number>) => {
    localStorage.setItem(LOGBOOK_COL_STORAGE_KEY, JSON.stringify(widths));
  }, []);

  const startResize = useCallback(
    (columnId: LogbookColumnId, clientX: number) => {
      resizeRef.current = {
        columnId,
        startX: clientX,
        startWidth: colWidths[columnId],
      };
      document.body.classList.add("logbook-col-resizing");
    },
    [colWidths],
  );

  useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      const active = resizeRef.current;
      if (!active) return;
      const delta = event.clientX - active.startX;
      const nextWidth = Math.max(MIN_COL_WIDTH, active.startWidth + delta);
      setColWidths((prev) => ({ ...prev, [active.columnId]: nextWidth }));
    }

    function onMouseUp() {
      if (!resizeRef.current) return;
      resizeRef.current = null;
      document.body.classList.remove("logbook-col-resizing");
      setColWidths((prev) => {
        persistWidths(prev);
        return prev;
      });
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.body.classList.remove("logbook-col-resizing");
    };
  }, [persistWidths]);

  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`logbook-entry-${highlightId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const clearId = window.setTimeout(() => {
      dispatch({ type: "CLEAR_LOGBOOK_HIGHLIGHT" });
    }, 4000);
    return () => window.clearTimeout(clearId);
  }, [highlightId, filtered, dispatch]);

  return (
    <div className="logbook-view">
      <header className="logbook-header">
        <h2>Notes &amp; logbook</h2>
        <p className="muted">
          Personal notes save with your game. Activity sheet below — newest rows
          first ({state.activityLog.length} entries). Drag column edges to resize.
        </p>
      </header>

      <section className="logbook-notes-section" aria-label="Player notes">
        <textarea
          className="notes-editor logbook-notes-editor"
          value={state.playerNotes}
          onChange={(event) =>
            dispatch({
              type: "UPDATE_PLAYER_NOTES",
              notes: event.target.value,
            })
          }
          placeholder="Bids, research plans, rival gossip…"
          spellCheck
          aria-label="Player notes"
        />
      </section>

      <div className="logbook-filters" role="tablist" aria-label="Log categories">
        {LOG_FILTER_GROUPS.map((group) => (
          <button
            key={group.id}
            type="button"
            role="tab"
            aria-selected={filterId === group.id}
            className={filterId === group.id ? "tab active" : "tab"}
            onClick={() =>
              dispatch({ type: "SET_LOGBOOK_FILTER", filterId: group.id })
            }
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
            <colgroup>
              {LOGBOOK_COLUMNS.map((col) => (
                <col
                  key={col.id}
                  style={{ width: `${colWidths[col.id]}px` }}
                />
              ))}
            </colgroup>
            <thead>
              <tr>
                {LOGBOOK_COLUMNS.map((col) => (
                  <th
                    key={col.id}
                    scope="col"
                    className={`col-${col.id}`}
                    style={{ width: `${colWidths[col.id]}px` }}
                  >
                    <span className="logbook-col-label">{col.label}</span>
                    <span
                      className="logbook-col-resize"
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Resize ${col.label} column`}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        startResize(col.id, event.clientX);
                      }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr
                  key={entry.id}
                  id={`logbook-entry-${entry.id}`}
                  className={
                    highlightId === entry.id ? "logbook-row-highlight" : undefined
                  }
                >
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
