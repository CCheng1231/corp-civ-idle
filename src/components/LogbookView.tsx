import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch } from "react";
import {
  LOG_CATEGORY_LABELS,
  LOG_FILTER_GROUPS,
  MAX_ACTIVITY_LOG_ENTRIES,
  formatLogTimeCellParts,
  logEntryCashTag,
  logEntryHeadline,
  officeLabel,
} from "../game/logbook";
import type { GameAction, GameState, LogCategory } from "../game/types";
import { isAllOfficesSelected } from "../game/officeSelection";
import { TabPortraitLayout } from "./TabPortraitLayout";
import { TabSiteHeader } from "./TabSiteHeader";
import { HubSyncedTabBackground } from "./HubSyncedTabBackground";
import { HubSyncedTabScrollBody } from "./HubSyncedTabScrollBody";
import { ConfirmDialog } from "./ConfirmDialog";
import { useDragScroll } from "../hooks/useDragScroll";

const LOGBOOK_PORTRAIT_SIZE_KEY = "corp-civ-idle-logbook-portrait-size";
const LOGBOOK_PAGE_SIZE = 50;

const FILTERABLE_GROUPS = LOG_FILTER_GROUPS.filter((group) => group.id !== "all");

function initialFilterIds(filterId: string): Set<string> {
  if (filterId === "all") return new Set(["all"]);
  return new Set([filterId]);
}

function filterSummaryLabel(selectedFilterIds: Set<string>): string {
  if (selectedFilterIds.has("all") || selectedFilterIds.size === 0) {
    return "All";
  }
  const labels = LOG_FILTER_GROUPS.filter((group) =>
    selectedFilterIds.has(group.id),
  ).map((group) => group.label);
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.length} selected`;
}

interface LogbookViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function LogbookView({ state, dispatch }: LogbookViewProps) {
  const filterId = state.logbookFilterId;
  const highlightId = state.logbookHighlightEntryId ?? null;
  const [page, setPage] = useState(0);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFilterIds, setSelectedFilterIds] = useState<Set<string>>(() =>
    initialFilterIds(filterId),
  );
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  const {
    dragging: sheetDragging,
    onPointerDown: onSheetDragDown,
    onPointerMove: onSheetDragMove,
    onPointerUp: onSheetDragUp,
    onPointerCancel: onSheetDragCancel,
  } = useDragScroll();

  const filtersActive =
    !selectedFilterIds.has("all") && selectedFilterIds.size > 0;

  const filtered = useMemo(() => {
    let entries = state.activityLog;
    if (!isAllOfficesSelected(state.selectedOffice)) {
      entries = entries.filter(
        (entry) => entry.officeId === state.selectedOffice,
      );
    }
    if (!filtersActive) {
      return entries;
    }
    const allowed = new Set<LogCategory>();
    for (const group of LOG_FILTER_GROUPS) {
      if (!selectedFilterIds.has(group.id)) continue;
      for (const category of group.categories) {
        allowed.add(category);
      }
    }
    if (allowed.size === 0) {
      return entries;
    }
    return entries.filter((entry) => allowed.has(entry.category));
  }, [state.activityLog, state.selectedOffice, selectedFilterIds, filtersActive]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / LOGBOOK_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageStart = currentPage * LOGBOOK_PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + LOGBOOK_PAGE_SIZE);
  const showingEnd =
    filtered.length === 0 ? 0 : Math.min(pageStart + LOGBOOK_PAGE_SIZE, filtered.length);

  useEffect(() => {
    setSelectedFilterIds(initialFilterIds(filterId));
  }, [filterId]);

  useEffect(() => {
    setPage(0);
  }, [selectedFilterIds]);

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

  useEffect(() => {
    if (!filterOpen) return;
    function onPointerDown(event: PointerEvent) {
      const root = filterPopoverRef.current;
      if (!root || root.contains(event.target as Node)) return;
      setFilterOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [filterOpen]);

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

  function toggleFilterGroup(groupId: string, checked: boolean) {
    setSelectedFilterIds((prev) => {
      const next = new Set(prev);
      if (groupId === "all") {
        return checked ? new Set(["all"]) : new Set();
      }
      next.delete("all");
      if (checked) {
        next.add(groupId);
      } else {
        next.delete(groupId);
      }
      if (next.size === 0) {
        return new Set(["all"]);
      }
      return next;
    });
  }

  function clearFilters() {
    setSelectedFilterIds(new Set(["all"]));
    dispatch({ type: "SET_LOGBOOK_FILTER", filterId: "all" });
  }

  function applyFilterSelection() {
    if (!selectedFilterIds.has("all") && selectedFilterIds.size === 1) {
      const [onlyId] = [...selectedFilterIds];
      dispatch({ type: "SET_LOGBOOK_FILTER", filterId: onlyId });
    } else {
      dispatch({ type: "SET_LOGBOOK_FILTER", filterId: "all" });
    }
    setFilterOpen(false);
  }

  const logbookBesidePortrait = (
    <TabSiteHeader secretaryHubTab="log" state={state} dispatch={dispatch} />
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
        placeholder="Write your own note"
        spellCheck
        aria-label="Player notes"
      />
    </section>
  );

  const logbookBelowPortrait = (
    <>
      {logbookNotes}
      <div className="logbook-activity-panel">
        <div className="logbook-activity-toolbar">
          <div className="logbook-filter-popover-wrap" ref={filterPopoverRef}>
            <label className="logbook-filter-trigger progression-hide-completed-check tab-queue-filter">
              <input
                type="checkbox"
                checked={filterOpen}
                onChange={(event) => setFilterOpen(event.target.checked)}
                aria-controls="logbook-filter-panel"
                aria-expanded={filterOpen}
              />
              Filter
              {filtersActive ? (
                <span className="logbook-filter-active-label">
                  · {filterSummaryLabel(selectedFilterIds)}
                </span>
              ) : null}
            </label>
            {filterOpen ? (
              <div
                id="logbook-filter-panel"
                className="logbook-filter-panel"
                role="group"
                aria-label="Log categories"
              >
                <div className="logbook-filter-panel-options">
                  {FILTERABLE_GROUPS.map((group) => (
                    <label
                      key={group.id}
                      className="logbook-filter-option progression-hide-completed-check"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFilterIds.has(group.id)}
                        onChange={(event) =>
                          toggleFilterGroup(group.id, event.target.checked)
                        }
                      />
                      {group.label}
                    </label>
                  ))}
                </div>
                <div className="logbook-filter-panel-actions">
                  <button
                    type="button"
                    className="logbook-filter-action-btn"
                    onClick={clearFilters}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="logbook-filter-action-btn logbook-filter-action-btn-primary"
                    onClick={applyFilterSelection}
                  >
                    Apply
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <div className="logbook-activity-meta">
            <span
              className="logbook-activity-count muted"
              aria-label={`${state.activityLog.length} of ${MAX_ACTIVITY_LOG_ENTRIES} log entries stored`}
            >
              {state.activityLog.length}/{MAX_ACTIVITY_LOG_ENTRIES}
            </span>
            <button
              type="button"
              className="logbook-clear-all-btn"
              disabled={state.activityLog.length === 0}
              onClick={() => setClearConfirmOpen(true)}
            >
              Clear all
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="muted logbook-empty">No entries in this category yet.</p>
        ) : (
          <div
            className={[
              "logbook-sheet-wrap",
              "logbook-sheet-wrap-hub",
              sheetDragging ? "logbook-sheet-wrap-dragging" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onPointerDown={(event) => {
              onSheetDragDown(event);
              event.stopPropagation();
            }}
            onPointerMove={(event) => {
              onSheetDragMove(event);
              event.stopPropagation();
            }}
            onPointerUp={(event) => {
              onSheetDragUp(event);
              event.stopPropagation();
            }}
            onPointerCancel={(event) => {
              onSheetDragCancel(event);
              event.stopPropagation();
            }}
          >
            <ul className="logbook-entry-list" aria-label="Activity log">
              {pageRows.map((entry) => {
                const { date, time } = formatLogTimeCellParts(entry.at);
                const cashTag = logEntryCashTag(entry, state.activityLog);
                const siteLabel = entry.officeId
                  ? officeLabel(entry.officeId, state)
                  : null;
                return (
                  <li
                    key={entry.id}
                    id={`logbook-entry-${entry.id}`}
                    className={[
                      "logbook-entry-card",
                      highlightId === entry.id ? "logbook-row-highlight" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <p className="logbook-entry-headline">
                      {logEntryHeadline(entry)}
                    </p>
                    <div className="logbook-entry-meta">
                      <time
                        dateTime={new Date(entry.at).toISOString()}
                        className="logbook-entry-time"
                      >
                        {date} {time}
                      </time>
                      <span className="logbook-tag logbook-tag-compact">
                        {LOG_CATEGORY_LABELS[entry.category]}
                      </span>
                      {siteLabel ? (
                        <span className="logbook-tag logbook-tag-compact logbook-tag-site">
                          {siteLabel}
                        </span>
                      ) : null}
                      {cashTag ? (
                        <span className="logbook-tag logbook-tag-compact logbook-tag-cash">
                          {cashTag}
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
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
              {filtersActive ? " in filter" : ""}
            </p>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="main-view-panel location-view-panel logbook-view hub-synced-tab-view">
      <HubSyncedTabBackground
        chiefId={state.chiefOfStaffId}
        portraitSource="secretary"
      />
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
      <HubSyncedTabScrollBody>
        <TabPortraitLayout
          storageKey={LOGBOOK_PORTRAIT_SIZE_KEY}
          portraitSpacer
          portraitLayout="stretch"
          parallaxScroll={false}
          portraitLocked={false}
          allowPortraitResize={false}
          className="tab-portrait-fit"
        >
          {logbookBesidePortrait}
        </TabPortraitLayout>
        <div className="hub-synced-tab-portrait-reveal" aria-hidden />
        <div className="tab-below-portrait">{logbookBelowPortrait}</div>
      </HubSyncedTabScrollBody>
    </div>
  );
}
