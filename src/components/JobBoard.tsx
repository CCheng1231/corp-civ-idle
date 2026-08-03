import { useEffect, useMemo, useState, type Dispatch } from "react";
import { rosterAt } from "../game/constants";
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
import { REGION_LABELS, towerById } from "../game/mapWorld";
import { formatTimerRemainingCompact } from "../game/timers";
import type { GameAction, GameState } from "../game/types";
import { JobPostingCard } from "./JobPostingCard";
import { emptyAssignmentForJob } from "./MissionCrewPicker";

interface JobBoardProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

function initialFiltersExpanded(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(min-width: 961px)").matches;
}

export function JobBoard({ state, dispatch }: JobBoardProps) {
  const now = Date.now();
  const officeId = state.selectedOffice;
  const officeRoster = rosterAt(state, officeId);
  const [filters, setFilters] = useState<JobBoardFilters>(DEFAULT_JOB_BOARD_FILTERS);
  const [sort, setSort] = useState<JobBoardSort>("expires_soon");
  const [selectedPostingId, setSelectedPostingId] = useState<string | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(initialFiltersExpanded);
  const [crewByPosting, setCrewByPosting] = useState<
    Record<string, ReturnType<typeof emptyAssignmentForJob>>
  >({});

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

  const towerOptions =
    filters.region === "all"
      ? options.towers
      : options.towers.filter((tower) => tower.region === filters.region);

  return (
    <section className="job-board" aria-labelledby="job-board-title">
      <header className="job-board-header">
        <h2 id="job-board-title">Job board</h2>
      </header>

      <div
        className={`job-board-layout${filtersExpanded ? " filters-expanded" : " filters-collapsed"}`}
      >
        {filtersExpanded ? (
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
        ) : null}

        <div className="job-board-list-pane">
          <div className="job-board-results-toolbar">
            <div className="job-board-toolbar-start">
              <button
                type="button"
                className={`tab job-board-filters-toggle${filtersExpanded ? " active" : ""}`}
                aria-expanded={filtersExpanded}
                aria-controls="job-board-filters-body"
                onClick={() => setFiltersExpanded((open) => !open)}
              >
                Filters
                {activeFilterCount > 0 && filtersExpanded ? (
                  <span className="job-board-filter-badge">{activeFilterCount}</span>
                ) : null}
              </button>
              <p
                className="job-board-count muted"
                title={`${visible.length} matching of ${allOpen.length} open postings`}
              >
                {visible.length} / {allOpen.length}
              </p>
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
            </div>
            <label className="job-board-sort">
              <span>Sort</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as JobBoardSort);
                  setSelectedPostingId(null);
                }}
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
          </div>

          {visible.length === 0 ? (
            <p className="muted job-board-empty">
              No postings match these filters. Try resetting or check the World
              map.
            </p>
          ) : (
            <div className="job-board-list-stage">
              <div className="job-board-list-wrap">
                <table className="job-board-list">
                  <thead>
                    <tr>
                      <th scope="col">Posting</th>
                      <th scope="col" className="job-board-col-tower">
                        Tower
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
                      const tower = towerById(posting.towerId);
                      const selected = posting.id === selectedPostingId;
                      return (
                        <tr
                          key={posting.id}
                          className={selected ? "job-board-row-selected" : undefined}
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
                                  {tower.name} · T{def.tier} · $
                                  {jobPayoutPerHour(posting).toFixed(0)}/hr
                                </span>
                              </span>
                            </button>
                          </td>
                          <td className="job-board-col-tower">
                            <span className="job-board-cell-stack">
                              <span>{tower.name}</span>
                              <span className="muted">
                                {REGION_LABELS[tower.region]}
                              </span>
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
              </div>

              {selectedPosting ? (
                <aside
                  className="job-board-detail-drawer is-open"
                  aria-label="Posting details"
                >
                  <div className="job-board-detail-drawer-head">
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
                    />
                  </div>
                </aside>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
