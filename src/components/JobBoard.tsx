import { useEffect, useLayoutEffect, useMemo, useState, type Dispatch } from "react";
import { createPortal } from "react-dom";
import { rosterAt } from "../game/constants";
import { resolveOfficeLocation } from "../game/officeSelection";
import {
  activeJobBoardFilterSummaries,
  countActiveJobBoardFilters,
  DEFAULT_JOB_BOARD_FILTERS,
  filterAndSortJobPostings,
  formatJobDurationSec,
  jobBoardFilterOptions,
  jobPayoutPerHour,
  JOB_BOARD_SORT_LABELS,
  openJobPostings,
  type JobBoardFilters,
  type JobBoardSort,
} from "../game/jobBoard";
import {
  BUSINESS_TYPE_LABELS,
  JOB_SIZE_LABELS,
  jobDefinitionForPosting,
} from "../game/jobs";
import { REGION_LABELS, jobSiteLabelForPosting, jobSiteRegionForPosting, towerById } from "../game/mapWorld";
import { formatTimerRemainingCompact } from "../game/timers";
import type { GameAction, GameState } from "../game/types";
import { JobPostingCard } from "./JobPostingCard";
import { emptyAssignmentForJob } from "./MissionCrewPicker";

const JOB_BOARD_DRAWER_SIZE_KEY = "corp-civ-idle-job-board-drawer-size";
const JOB_BOARD_SORT_KEY = "corp-civ-idle-job-board-sort";
export const SECRETARY_JOB_BOARD_TOOLBAR_SLOT_ID =
  "secretary-job-board-toolbar-slot";

type JobBoardDrawerSize = "compact" | "large";

function usePortalTarget(slotId: string, enabled: boolean) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!enabled) {
      setTarget(null);
      return;
    }
    setTarget(document.getElementById(slotId));
  }, [slotId, enabled]);

  return target;
}

function initialSort(): JobBoardSort {
  try {
    const stored = localStorage.getItem(JOB_BOARD_SORT_KEY);
    if (stored && stored in JOB_BOARD_SORT_LABELS) {
      return stored as JobBoardSort;
    }
  } catch {
    /* ignore */
  }
  return "expires_soon";
}

function initialDrawerSize(): JobBoardDrawerSize {
  try {
    const stored = localStorage.getItem(JOB_BOARD_DRAWER_SIZE_KEY);
    if (stored === "compact" || stored === "large") return stored;
  } catch {
    /* ignore */
  }
  return "compact";
}

interface JobBoardProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  /** Hide section title when nested in Secretary tab. */
  embedded?: boolean;
  /** Secretary sub-tab is on Job board (controls tab-toolbar portals). */
  embeddedActive?: boolean;
}

export function JobBoard({
  state,
  dispatch,
  embedded = false,
  embeddedActive = true,
}: JobBoardProps) {
  const now = Date.now();
  const officeId = resolveOfficeLocation(state);
  const officeRoster = rosterAt(state, officeId);
  const [filters, setFilters] = useState<JobBoardFilters>(DEFAULT_JOB_BOARD_FILTERS);
  const [sort, setSort] = useState<JobBoardSort>(initialSort);
  const [selectedPostingId, setSelectedPostingId] = useState<string | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [drawerSize, setDrawerSize] = useState<JobBoardDrawerSize>(initialDrawerSize);
  const drawerLarge = drawerSize === "large";
  const [crewByPosting, setCrewByPosting] = useState<
    Record<string, ReturnType<typeof emptyAssignmentForJob>>
  >({});

  useEffect(() => {
    try {
      localStorage.setItem(JOB_BOARD_DRAWER_SIZE_KEY, drawerSize);
    } catch {
      /* ignore */
    }
  }, [drawerSize]);

  useEffect(() => {
    try {
      localStorage.setItem(JOB_BOARD_SORT_KEY, sort);
    } catch {
      /* ignore */
    }
  }, [sort]);

  const options = jobBoardFilterOptions();
  const allOpen = useMemo(() => openJobPostings(state), [state.jobPostings]);
  const visible = useMemo(
    () => filterAndSortJobPostings(allOpen, filters, sort, now),
    [allOpen, filters, sort, now],
  );
  const activeFilterCount = countActiveJobBoardFilters(filters);
  const activeFilterSummaries = useMemo(
    () => activeJobBoardFilterSummaries(filters),
    [filters],
  );

  useEffect(() => {
    if (!state.selectedTowerId) return;
    const tower = towerById(state.selectedTowerId);
    setFilters((prev) => {
      if (prev.towerId === state.selectedTowerId) return prev;
      const region =
        prev.region === "all" || prev.region === tower.region
          ? prev.region
          : "all";
      return {
        ...prev,
        region,
        towerId: state.selectedTowerId!,
      };
    });
  }, [state.selectedTowerId]);

  useEffect(() => {
    const focusId = state.jobFocusPostingId;
    if (!focusId) return;

    const posting = state.jobPostings.find((p) => p.id === focusId);
    if (!posting || posting.status !== "open") {
      dispatch({ type: "CLEAR_JOB_FOCUS" });
      return;
    }

    const def = jobDefinitionForPosting(posting);
    const region = jobSiteRegionForPosting(posting, def);
    setFilters({
      ...DEFAULT_JOB_BOARD_FILTERS,
      region,
      towerId: posting.towerId ?? "all",
    });
    setSelectedPostingId(focusId);

    const scrollTimer = window.setTimeout(() => {
      document
        .querySelector(`[data-job-posting-id="${focusId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);

    const clearTimer = window.setTimeout(() => {
      dispatch({ type: "CLEAR_JOB_FOCUS" });
    }, 4000);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [state.jobFocusPostingId, state.jobPostings, dispatch]);

  const selectedPosting =
    visible.find((posting) => posting.id === selectedPostingId) ?? null;

  function updateFilter<K extends keyof JobBoardFilters>(
    key: K,
    value: JobBoardFilters[K],
  ) {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "region" && value !== "all" && next.towerId !== "all") {
        const tower = options.towers.find((t) => t.id === next.towerId);
        if (tower && tower.region !== value) {
          next.towerId = "all";
        }
      }
      if (key === "towerId") {
        const towerValue = value as JobBoardFilters["towerId"];
        dispatch({
          type: "SELECT_TOWER",
          towerId: towerValue === "all" ? null : towerValue,
        });
      } else if (key === "region" && next.towerId === "all") {
        dispatch({ type: "SELECT_TOWER", towerId: null });
      }
      if (
        selectedPostingId &&
        !filterAndSortJobPostings(allOpen, next, sort, now).some(
          (p) => p.id === selectedPostingId,
        )
      ) {
        setSelectedPostingId(null);
      }
      return next;
    });
  }

  function resetFilters() {
    setFilters(DEFAULT_JOB_BOARD_FILTERS);
    setSort("expires_soon");
    setSelectedPostingId(null);
    dispatch({ type: "SELECT_TOWER", towerId: null });
  }

  function assignmentFor(postingId: string, definitionId: string) {
    return emptyAssignmentForJob(
      definitionId,
      officeRoster,
      crewByPosting,
      postingId,
    );
  }

  function clearFilter(key: keyof JobBoardFilters) {
    updateFilter(key, DEFAULT_JOB_BOARD_FILTERS[key]);
  }

  function selectPosting(postingId: string) {
    setSelectedPostingId(postingId);
  }

  function closePostingDetail() {
    setSelectedPostingId(null);
  }

  function handlePostingRowClick(postingId: string) {
    selectPosting(postingId);
  }

  function handlePostingRowDoubleClick(postingId: string) {
    if (selectedPostingId === postingId) {
      closePostingDetail();
    }
  }

  function handleEngageSuccess(postingId: string) {
    setSelectedPostingId(null);
    setCrewByPosting((prev) => {
      if (!prev[postingId]) return prev;
      const next = { ...prev };
      delete next[postingId];
      return next;
    });
  }

  const towerOptions =
    filters.region === "all"
      ? options.towers
      : options.towers.filter((tower) => tower.region === filters.region);

  const sortControl = (compact = false) => (
    <label
      className={`job-board-sort${compact ? " job-board-sort-compact" : ""}`}
    >
      <span>Sort</span>
      <select
        value={sort}
        aria-label={compact ? "Sort postings" : undefined}
        onChange={(e) => setSort(e.target.value as JobBoardSort)}
      >
        {(Object.entries(JOB_BOARD_SORT_LABELS) as [JobBoardSort, string][]).map(
          ([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ),
        )}
      </select>
    </label>
  );

  const filterControls = (
    <>
      <button
        type="button"
        className={`btn linkish job-board-filters-toggle${filtersExpanded ? " job-board-filters-toggle-open" : ""}`}
        aria-expanded={filtersExpanded}
        aria-controls="job-board-filters-body"
        onClick={() => setFiltersExpanded((open) => !open)}
      >
        {filtersExpanded ? "Hide filters" : "Filters"}
        {activeFilterCount > 0 && !filtersExpanded ? (
          <span className="job-board-filter-badge">{activeFilterCount}</span>
        ) : null}
      </button>
      {!filtersExpanded && activeFilterSummaries.length > 0 ? (
        <ul className="job-board-active-filters" aria-label="Active filters">
          {activeFilterSummaries.map(({ key, label }) => (
            <li key={key}>
              <button
                type="button"
                className="job-board-active-filter-chip"
                title={`Clear filter: ${label}`}
                onClick={() => clearFilter(key)}
              >
                <span>{label}</span>
                <span className="job-board-active-filter-clear" aria-hidden="true">
                  ×
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );

  const toolbarStart = (
    <div className="job-board-toolbar-start">
      {filterControls}
      {!embedded ? (
        <p
          className="job-board-count muted"
          title={`${visible.length} matching of ${allOpen.length} open postings`}
        >
          {visible.length} / {allOpen.length}
        </p>
      ) : null}
    </div>
  );

  const embeddedChromeActive = embedded && embeddedActive;
  const toolbarPortalTarget = usePortalTarget(
    SECRETARY_JOB_BOARD_TOOLBAR_SLOT_ID,
    embeddedChromeActive,
  );

  const embeddedTabToolbar = (
    <div className="secretary-job-board-tab-toolbar">
      {filterControls}
      {sortControl(true)}
    </div>
  );

  const embeddedListTail = embeddedChromeActive ? (
    <div className="job-board-list-tail-spacer" aria-hidden="true" />
  ) : null;

  const renderFiltersPanel = () => (
    <aside className="job-board-filters" aria-label="Job filters">
      <div className="job-board-filters-head">
        <h3>Filters</h3>
        <div className="job-board-filters-actions">
          <button
            type="button"
            className="tab job-board-filter-action"
            onClick={resetFilters}
          >
            Reset
          </button>
          <button
            type="button"
            className="tab job-board-filter-action"
            aria-expanded={filtersExpanded}
            aria-controls="job-board-filters-body"
            onClick={() => setFiltersExpanded(false)}
          >
            Close
          </button>
        </div>
      </div>

      <div id="job-board-filters-body" className="job-board-filters-body">
        <label className="job-board-filter">
          <span>Region</span>
          <select
            value={filters.region}
            onChange={(e) =>
              updateFilter("region", e.target.value as JobBoardFilters["region"])
            }
          >
            <option value="all">All regions</option>
            {options.regions.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="job-board-filter">
          <span>Tower</span>
          <select
            value={filters.towerId}
            onChange={(e) =>
              updateFilter("towerId", e.target.value as JobBoardFilters["towerId"])
            }
          >
            <option value="all">All towers</option>
            {towerOptions.map((tower) => (
              <option key={tower.id} value={tower.id}>
                {tower.label}
              </option>
            ))}
          </select>
        </label>

        <label className="job-board-filter">
          <span>Business type</span>
          <select
            value={filters.businessType}
            onChange={(e) =>
              updateFilter(
                "businessType",
                e.target.value as JobBoardFilters["businessType"],
              )
            }
          >
            <option value="all">All types</option>
            {options.businessTypes.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="job-board-filter">
          <span>Tier</span>
          <select
            value={filters.tier === "all" ? "all" : String(filters.tier)}
            onChange={(e) =>
              updateFilter(
                "tier",
                e.target.value === "all"
                  ? "all"
                  : (Number(e.target.value) as JobBoardFilters["tier"]),
              )
            }
          >
            <option value="all">All tiers</option>
            {options.tiers.map((tier) => (
              <option key={tier} value={tier}>
                Tier {tier}
              </option>
            ))}
          </select>
        </label>

        <label className="job-board-filter">
          <span>Size band</span>
          <select
            value={filters.size}
            onChange={(e) =>
              updateFilter("size", e.target.value as JobBoardFilters["size"])
            }
          >
            <option value="all">All sizes</option>
            {options.sizes.map((size) => (
              <option key={size} value={size}>
                {JOB_SIZE_LABELS[size]}
              </option>
            ))}
          </select>
        </label>

        <label className="job-board-filter">
          <span>Unit category</span>
          <select
            value={filters.category}
            onChange={(e) =>
              updateFilter(
                "category",
                e.target.value as JobBoardFilters["category"],
              )
            }
          >
            <option value="all">All categories</option>
            {options.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <div className="job-board-map-support">
          <h4>World map</h4>
          <p className="muted">
            Click a tower on the map to jump here filtered to that site.
          </p>
          <button
            type="button"
            className="btn linkish job-board-open-map"
            onClick={() => dispatch({ type: "SET_VIEW", view: "world" })}
          >
            Open World map
          </button>
        </div>
      </div>
    </aside>
  );

  const listContent =
    visible.length === 0 ? (
      <div
        className={`job-board-list-stage${
          embeddedChromeActive ? " job-board-list-stage-embedded" : ""
        }`}
      >
        <div className="job-board-list-wrap job-board-list-wrap-empty">
          <p className="muted job-board-empty">
            No postings match these filters. Try resetting or check the World map.
          </p>
          {embeddedListTail}
        </div>
      </div>
    ) : (
      <div
        className={`job-board-list-stage${
          embeddedChromeActive ? " job-board-list-stage-embedded" : ""
        }${selectedPosting && drawerLarge ? " is-drawer-large" : ""}`}
      >
        <div className="job-board-list-wrap">
          <table className="job-board-list">
            <thead>
              <tr>
                <th scope="col">Posting</th>
                <th scope="col" className="job-board-col-tower">
                  Site
                </th>
                <th scope="col" className="job-board-col-tier">
                  Tier
                </th>
                <th scope="col" className="job-board-col-payout">
                  Payout
                </th>
                <th scope="col" className="job-board-col-expires">
                  Exp.
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((posting) => {
                const def = jobDefinitionForPosting(posting);
                const siteLabel = jobSiteLabelForPosting(posting, def);
                const siteRegion = jobSiteRegionForPosting(posting, def);
                const selected = posting.id === selectedPostingId;
                const highlighted = posting.id === state.jobFocusPostingId;
                return (
                  <tr
                    key={posting.id}
                    data-job-posting-id={posting.id}
                    className={[
                      selected ? "job-board-row-selected" : "",
                      highlighted ? "job-board-row-highlight" : "",
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined}
                  >
                    <td>
                      <button
                        type="button"
                        className="job-board-row-btn"
                        aria-current={selected ? "true" : undefined}
                        onClick={() => handlePostingRowClick(posting.id)}
                        onDoubleClick={() =>
                          handlePostingRowDoubleClick(posting.id)
                        }
                      >
                        <strong>{def.title}</strong>
                        <span className="muted job-board-row-meta">
                          <span className="job-board-row-meta-primary">
                            {BUSINESS_TYPE_LABELS[def.businessType]} ·{" "}
                            {JOB_SIZE_LABELS[def.size]} ·{" "}
                            {formatJobDurationSec(def.durationSec)}
                          </span>
                          <span className="job-board-row-meta-mobile">
                            {siteLabel} · T{def.tier} · $
                            {jobPayoutPerHour(posting).toFixed(0)}/hr
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="job-board-col-tower">
                      <span className="job-board-cell-stack">
                        <span>{siteLabel}</span>
                        <span className="muted">{REGION_LABELS[siteRegion]}</span>
                      </span>
                    </td>
                    <td className="job-board-col-tier">T{def.tier}</td>
                    <td className="job-board-col-payout">
                      ${jobPayoutPerHour(posting).toFixed(1)}/hr
                    </td>
                    <td className="job-board-col-expires">
                      {formatTimerRemainingCompact(
                        state,
                        posting.expiresAt,
                        now,
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {embeddedListTail}
        </div>

        {selectedPosting ? (
          <aside
            className={`job-board-detail-drawer is-open${
              drawerLarge ? " is-large" : ""
            }`}
            aria-label="Posting details"
          >
            <div className="job-board-detail-drawer-head">
              <button
                type="button"
                className="tab job-board-detail-resize"
                aria-pressed={drawerLarge}
                onClick={() =>
                  setDrawerSize((size) =>
                    size === "large" ? "compact" : "large",
                  )
                }
              >
                {drawerLarge ? "Smaller" : "Larger"}
              </button>
              <button
                type="button"
                className="job-board-detail-close"
                aria-label="Close posting details"
                onClick={closePostingDetail}
              >
                ×
              </button>
            </div>
            <div className="job-board-detail-drawer-body">
              <JobPostingCard
                state={state}
                dispatch={dispatch}
                posting={selectedPosting}
                showTower
                assignment={assignmentFor(
                  selectedPosting.id,
                  selectedPosting.definitionId,
                )}
                onAssignmentChange={(next) =>
                  setCrewByPosting((prev) => ({
                    ...prev,
                    [selectedPosting.id]: next,
                  }))
                }
                onEngageSuccess={() => handleEngageSuccess(selectedPosting.id)}
              />
            </div>
          </aside>
        ) : null}
      </div>
    );

  return (
    <>
      {toolbarPortalTarget
        ? createPortal(embeddedTabToolbar, toolbarPortalTarget)
        : null}
      <section
      className={`job-board${embedded ? " job-board-embedded" : ""}`}
      aria-labelledby={embedded ? undefined : "job-board-title"}
      aria-label={embedded ? "Job board" : undefined}
    >
      {embedded ? null : (
        <header className="job-board-header">
          <h2 id="job-board-title">Job board</h2>
        </header>
      )}

      <div
        className={`job-board-layout${
          embedded
            ? " job-board-layout-embedded"
            : filtersExpanded
              ? " filters-expanded"
              : " filters-collapsed"
        }`}
      >
        {!embedded && filtersExpanded ? renderFiltersPanel() : null}

        <div className="job-board-list-pane">
          {embedded && filtersExpanded ? (
            <>
              <button
                type="button"
                className="job-board-filters-backdrop"
                aria-label="Close filters"
                onClick={() => setFiltersExpanded(false)}
              />
              <div
                className="job-board-filters-popup"
                role="dialog"
                aria-label="Job filters"
              >
                {renderFiltersPanel()}
              </div>
            </>
          ) : null}

          {!embedded ? (
            <div className="job-board-results-toolbar">
              {toolbarStart}
              {sortControl()}
            </div>
          ) : null}

          {listContent}
        </div>
      </div>
    </section>
    </>
  );
}
