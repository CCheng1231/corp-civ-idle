import { useMemo } from "react";
import {
  DEFAULT_JOB_BOARD_FILTERS,
  activeJobBoardFilterSummaries,
  countActiveJobBoardFilters,
  filterAndSortJobPostings,
  jobBoardFilterOptions,
  openJobPostings,
  type JobBoardFilters,
} from "../game/jobBoard";
import { jobDefinitionForPosting } from "../game/jobs";
import { formatNumber } from "../game/constants";
import {
  hexDistanceFromMainOfficeForState,
  jobSiteCoordForPosting,
  jobSiteLabelForPosting,
  jobSiteRegionForPosting,
} from "../game/mapWorld";
import type { GameState, JobPosting } from "../game/types";

interface MapJobFilterPanelProps {
  state: GameState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  filters: JobBoardFilters;
  onFiltersChange: (filters: JobBoardFilters) => void;
  onFocusPosting: (posting: JobPosting) => void;
  selectedPostingId: string | null;
}

export function MapJobFilterPanel({
  state,
  open,
  onOpenChange,
  expanded,
  onExpandedChange,
  filters,
  onFiltersChange,
  onFocusPosting,
  selectedPostingId,
}: MapJobFilterPanelProps) {
  const options = jobBoardFilterOptions();
  const allOpen = openJobPostings(state);
  const visible = useMemo(
    () => filterAndSortJobPostings(allOpen, filters, "expires_soon"),
    [allOpen, filters],
  );
  const activeCount = countActiveJobBoardFilters(filters);
  const activeSummaries = activeJobBoardFilterSummaries(filters);

  const towerOptions =
    filters.region === "all"
      ? options.towers
      : options.towers.filter((tower) => tower.region === filters.region);

  function updateFilter<K extends keyof JobBoardFilters>(
    key: K,
    value: JobBoardFilters[K],
  ) {
    onFiltersChange({ ...filters, [key]: value });
  }

  function resetFilters() {
    onFiltersChange({ ...DEFAULT_JOB_BOARD_FILTERS });
  }

  return (
    <aside
      className={`map-job-filter-panel${open ? " is-open" : ""}${
        expanded ? " is-expanded" : ""
      }`}
      aria-label="Job map filters"
    >
      <div className="map-job-filter-head">
        <button
          type="button"
          className="map-job-filter-toggle-jobs"
          aria-expanded={open}
          onClick={() => onOpenChange(!open)}
        >
          Jobs
        </button>
        {open ? (
          <button
            type="button"
            className="map-job-filter-expand linkish"
            aria-expanded={expanded}
            onClick={() => onExpandedChange(!expanded)}
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        ) : null}
        <button
          type="button"
          className="map-job-filter-toggle-meta"
          aria-expanded={open}
          onClick={() => onOpenChange(!open)}
        >
          <span
            className={`map-job-filter-toggle-count${
              activeCount > 0 ? " is-filtered" : ""
            }`}
          >
            {visible.length}
            <span className="sr-only"> matching postings</span>
          </span>
          <span className="map-job-filter-toggle-caret" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
        </button>
      </div>

      {open ? (
        <div className="map-job-filter-body">
          {activeSummaries.length > 0 ? (
            <div className="map-job-filter-chips" aria-label="Active filters">
              {activeSummaries.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className="map-job-filter-chip"
                  onClick={() =>
                    updateFilter(key, DEFAULT_JOB_BOARD_FILTERS[key])
                  }
                >
                  {label} ×
                </button>
              ))}
              <button
                type="button"
                className="map-job-filter-reset linkish"
                onClick={resetFilters}
              >
                Reset
              </button>
            </div>
          ) : null}

          <div className="map-job-filter-grid">
            <label className="map-job-filter-field">
              <span>Region</span>
              <select
                value={filters.region}
                onChange={(e) =>
                  updateFilter(
                    "region",
                    e.target.value as JobBoardFilters["region"],
                  )
                }
              >
                <option value="all">All</option>
                {options.regions.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="map-job-filter-field map-job-filter-field--select-long">
              <span>Role</span>
              <select
                value={filters.category}
                onChange={(e) =>
                  updateFilter(
                    "category",
                    e.target.value as JobBoardFilters["category"],
                  )
                }
              >
                <option value="all">All</option>
                {options.categories.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="map-job-filter-field">
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
                <option value="all">All</option>
                {options.tiers.map((tier) => (
                  <option key={tier} value={tier}>
                    T{tier}
                  </option>
                ))}
              </select>
            </label>
            <label className="map-job-filter-field map-job-filter-field--select-long">
              <span>Tower</span>
              <select
                value={filters.towerId}
                onChange={(e) =>
                  updateFilter(
                    "towerId",
                    e.target.value as JobBoardFilters["towerId"],
                  )
                }
              >
                <option value="all">All</option>
                {towerOptions.map((tower) => (
                  <option key={tower.id} value={tower.id}>
                    {tower.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <ul className="map-job-filter-list" aria-label="Matching job postings">
            {visible.length === 0 ? (
              <li className="map-job-filter-empty muted">
                No jobs match — widen filters or check Secretary board.
              </li>
            ) : (
              (expanded ? visible : visible.slice(0, 12)).map((posting) => {
                let def;
                try {
                  def = jobDefinitionForPosting(posting);
                } catch {
                  return null;
                }
                const region = jobSiteRegionForPosting(posting, def);
                const selected = posting.id === selectedPostingId;
                const payout = def.cashPerUnitHour;
                const roleLabel =
                  options.categories.find(
                    (entry) => entry.id === def.requiredCategory,
                  )?.label ?? def.requiredCategory;
                const towerLabel = jobSiteLabelForPosting(posting, def);
                const distanceHx = hexDistanceFromMainOfficeForState(
                  state,
                  jobSiteCoordForPosting(posting, def, state.settings),
                );
                return (
                  <li key={posting.id}>
                    <button
                      type="button"
                      className={`map-job-filter-row${selected ? " is-selected" : ""}`}
                      onClick={() => onFocusPosting(posting)}
                    >
                      <span
                        className={`map-job-filter-region map-job-filter-region-${region}`}
                        aria-hidden
                      />
                      <span className="map-job-filter-row-main">
                        <span className="map-job-filter-row-title">
                          {def.title}
                        </span>
                        <span className="map-job-filter-row-meta">
                          <span className="map-job-filter-row-meta-role-tower">
                            {roleLabel} · {towerLabel}
                          </span>
                          <span className="map-job-filter-row-meta-payout">
                            T{def.tier} · ${formatNumber(payout)}/hr ·{" "}
                            {distanceHx} Hx
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          {!expanded && visible.length > 12 ? (
            <p className="map-job-filter-more muted">
              +{visible.length - 12} more — expand list or use Secretary tab
            </p>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
