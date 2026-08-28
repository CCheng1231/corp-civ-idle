import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch } from "react";
import {
  LOG_CATEGORY_LABELS,
  LOG_FILTER_GROUPS,
  MAX_ACTIVITY_LOG_ENTRIES,
  formatLogCostCell,
  formatLogImpactsCell,
  formatLogTimeCell,
  officeLabel,
} from "../game/logbook";
import type { GameAction, GameState, LogCategory } from "../game/types";
import {
  DUAL_PORTRAIT_TAB_PROPS,
  TabPortraitLayout,
  dualPortraitTabClass,
  portraitLockBodyClass,
  portraitLockPageClass,
  useTabPortraitSize,
} from "./TabPortraitLayout";
import { tabQuote } from "../game/tabQuotes";
import logbookPortrait from "../assets/Logbook.jpg";
import { ConfirmDialog } from "./ConfirmDialog";

const LOGBOOK_COL_STORAGE_KEY = "corp-civ-idle-logbook-col-widths";
const LOGBOOK_PAGE_SIZE = 50;

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
  const [page, setPage] = useState(0);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const portraitStorageKey = "corp-civ-idle-logbook-portrait-size";
  const { portraitSize, setPortraitSize, portraitLarge } = useTabPortraitSize(
    portraitStorageKey,
    true,
  );
  const resizeRef = useRef<{
    columnId: LogbookColumnId;
    startX: number;
    startWidth: number;
  } | null>(null);
  const sheetDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    dragging: boolean;
  } | null>(null);
  const filtered = useMemo(() => {
    const group = LOG_FILTER_GROUPS.find((g) => g.id === filterId);
    if (!group || group.categories.length === 0) {
      return state.activityLog;
    }
    const allowed = new Set<LogCategory>(group.categories);
    return state.activityLog.filter((entry) => allowed.has(entry.category));
  }, [state.activityLog, filterId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / LOGBOOK_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageStart = currentPage * LOGBOOK_PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + LOGBOOK_PAGE_SIZE);
  const showingEnd =
    filtered.length === 0 ? 0 : Math.min(pageStart + LOGBOOK_PAGE_SIZE, filtered.length);

  useEffect(() => {
    setPage(0);
  }, [filterId]);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (!highlightId) return;
    const index = filtered.findIndex((entry) => entry.id === highlightId);
    if (index >= 0) {
      setPage(Math.floor(index / LOGBOOK_PAGE_SIZE));
    }
  }, [highlightId, filtered]);

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
  }, [highlightId, filtered, currentPage, dispatch]);

  const logbookHeader = (
    <header className="main-view-header location-view-header logbook-view-header">
      <div className="logbook-header-title-row">
        <h2>Notes &amp; logbook</h2>
        <button
          type="button"
          className="btn linkish logbook-clear-all-btn"
          disabled={state.activityLog.length === 0}
          onClick={() => setClearConfirmOpen(true)}
        >
          Clear all
        </button>
      </div>
      <p className="muted">
        Personal notes save with your game. Activity sheet below — newest rows
        first ({state.activityLog.length}/{MAX_ACTIVITY_LOG_ENTRIES} stored,{" "}
        {LOGBOOK_PAGE_SIZE} per page). Drag column edges to resize.
      </p>
    </header>
  );

  const logbookNotes = (
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
  );

  const logbookActivity = (
    <div className="logbook-activity-panel">
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
        <div
          className="logbook-sheet-wrap"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            if ((event.target as HTMLElement).closest(".logbook-col-resize")) {
              return;
            }
            const el = event.currentTarget;
            sheetDragRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              scrollLeft: el.scrollLeft,
              scrollTop: el.scrollTop,
              dragging: false,
            };
          }}
          onPointerMove={(event) => {
            const drag = sheetDragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            const el = event.currentTarget;
            const dx = event.clientX - drag.startX;
            const dy = event.clientY - drag.startY;
            if (!drag.dragging) {
              if (dx * dx + dy * dy < 16) return;
              drag.dragging = true;
              el.setPointerCapture(event.pointerId);
            }
            el.scrollLeft = drag.scrollLeft - dx;
            el.scrollTop = drag.scrollTop - dy;
          }}
          onPointerUp={(event) => {
            const drag = sheetDragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            if (drag.dragging && event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            sheetDragRef.current = null;
          }}
          onPointerCancel={(event) => {
            const drag = sheetDragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            if (drag.dragging && event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            sheetDragRef.current = null;
          }}
        >
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
              {pageRows.map((entry) => (
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
          {totalPages > 1 ? (
            <nav
              className="logbook-sheet-pagination"
              aria-label="Logbook pages"
            >
              <button
                type="button"
                className="tab logbook-page-btn"
                disabled={currentPage === 0}
                aria-label="Previous page"
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              >
                ←
              </button>
              <span className="logbook-page-label">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                type="button"
                className="tab logbook-page-btn"
                disabled={currentPage >= totalPages - 1}
                aria-label="Next page"
                onClick={() =>
                  setPage((prev) => Math.min(totalPages - 1, prev + 1))
                }
              >
                →
              </button>
            </nav>
          ) : null}
          <p className="muted logbook-sheet-foot">
            Showing {filtered.length === 0 ? 0 : pageStart + 1}–{showingEnd} of{" "}
            {filtered.length}
            {filterId !== "all" ? " in filter" : ""}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div
      className={`main-view-panel location-view-panel logbook-view ${portraitLockPageClass(portraitLarge)}`}
    >
      {clearConfirmOpen ? (
        <ConfirmDialog
          title="Clear activity log?"
          message="This removes every stored log row from this save. Your personal notes are not affected."
          confirmLabel="Clear all"
          cancelLabel="Keep log"
          onConfirm={() => {
            dispatch({ type: "CLEAR_ACTIVITY_LOG" });
            setClearConfirmOpen(false);
            setPage(0);
          }}
          onCancel={() => setClearConfirmOpen(false)}
        />
      ) : null}
      {portraitLarge ? logbookHeader : null}
      <div
        className={`location-view-body ${portraitLockBodyClass(portraitLarge)}`}
      >
        <TabPortraitLayout
          src={logbookPortrait}
          storageKey={portraitStorageKey}
          portraitSize={portraitSize}
          onPortraitSizeChange={setPortraitSize}
          className={`logbook-portrait-layout ${dualPortraitTabClass(portraitLarge)}`}
          quote={tabQuote(state, "logbook")}
          {...DUAL_PORTRAIT_TAB_PROPS}
        >
          {portraitLarge ? (
            <>
              {logbookNotes}
              {logbookActivity}
            </>
          ) : (
            <div className="portrait-lock-split-right">
              <div className="portrait-lock-frozen-header">
                {logbookHeader}
                {logbookNotes}
              </div>
              <div className="portrait-lock-scroll-body">{logbookActivity}</div>
            </div>
          )}
        </TabPortraitLayout>
      </div>
    </div>
  );
}
