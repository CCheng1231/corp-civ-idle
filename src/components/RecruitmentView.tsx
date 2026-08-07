import { useEffect, useState, type Dispatch } from "react";
import {
  MAX_RECRUIT_BATCH,
  MAX_RECRUIT_QUEUE,
  OFFICE_LABELS,
  canAffordAtOffice,
  countInCategory,
  formatNumber,
  isRecruitmentQueueFull,
  recruitBatchCost,
  recruitmentJobsAtOffice,
  recruitmentOrderBuildTimeHours,
  rosterAt,
  totalWorkforce,
} from "../game/constants";
import { RECRUITMENT_UNITS } from "../game/recruitmentData";
import type { RecruitmentUnitDefinition } from "../game/recruitmentData";
import type { ContractorCategoryId } from "../game/types";
import { formatQueueTimeHours } from "../game/timers";
import type { GameAction, GameState, UnitId } from "../game/types";
import { RecruitmentQueueList, QueueSection } from "./StructureBuildQueueList";
import { StructureCostLine } from "./StructureCostLine";
import { LocationViewHeader } from "./LocationViewHeader";

interface RecruitmentViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const RECRUITMENT_CATEGORY_ORDER: ContractorCategoryId[] = [
  "farming",
  "defense",
  "intel",
  "support",
  "special",
];

const CATEGORY_LABELS: Record<ContractorCategoryId, string> = {
  farming: "Resource farming",
  defense: "Protection & defense",
  intel: "Intel & scouting",
  support: "Support",
  special: "Special",
};

const CATEGORY_SHORT: Record<ContractorCategoryId, string> = {
  farming: "Farm",
  defense: "Def",
  intel: "Intel",
  support: "Sup",
  special: "Spec",
};

function officeStaffCategorySummary(
  roster: ReturnType<typeof rosterAt>,
): string {
  const parts = RECRUITMENT_CATEGORY_ORDER.filter(
    (category) => countInCategory(roster, category) > 0,
  ).map(
    (category) =>
      `${CATEGORY_SHORT[category]} ${countInCategory(roster, category)}`,
  );
  return parts.length > 0 ? parts.join(" · ") : "No units at this site yet";
}

function recruitmentBlockerMessage(researchLocked: boolean): string | null {
  if (researchLocked) return "Requires Branch Management research";
  return null;
}

export function RecruitmentView({ state, dispatch }: RecruitmentViewProps) {
  const officeId = state.selectedOffice;
  const now = Date.now();
  const [counts, setCounts] = useState<Partial<Record<UnitId, number>>>({});
  const [rosterOpen, setRosterOpen] = useState(false);
  const queue = recruitmentJobsAtOffice(state, officeId);
  const queueFull = isRecruitmentQueueFull(state, officeId);
  const roster = rosterAt(state, officeId);
  const staffTotal = totalWorkforce(roster);
  const pendingHires = queue.reduce((sum, job) => sum + (job.count ?? 1), 0);
  const staffCategorySummary = officeStaffCategorySummary(roster);
  const focusUnitId = state.recruitFocusUnitId ?? null;

  useEffect(() => {
    if (!focusUnitId) return;
    const el = document.getElementById(`recruit-unit-${focusUnitId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const clearId = window.setTimeout(() => {
      dispatch({
        type: "SET_VIEW",
        view: "recruitment",
        recruitFocusUnitId: null,
      });
    }, 2500);
    return () => window.clearTimeout(clearId);
  }, [focusUnitId, dispatch]);

  function hire(unitId: UnitId) {
    const count = Math.max(
      1,
      Math.min(MAX_RECRUIT_BATCH, counts[unitId] ?? 1),
    );
    dispatch({
      type: "START_RECRUITMENT",
      officeId,
      unitId,
      count,
    });
  }

  function renderUnitCard(unit: RecruitmentUnitDefinition) {
    const count = counts[unit.id] ?? 1;
    const cost = recruitBatchCost(unit.id, count);
    const researchLocked =
      unit.id === "branch_manager" &&
      (state.researchLevels.branch_management ?? 0) < 1;
    const affordable =
      !researchLocked && canAffordAtOffice(state, officeId, cost);
    const orderHours = recruitmentOrderBuildTimeHours(count);
    const blocker = recruitmentBlockerMessage(researchLocked);

    const focused = focusUnitId === unit.id;
    return (
      <li
        key={unit.id}
        id={`recruit-unit-${unit.id}`}
        className={`structure-card structure-card-upgrade recruitment-card-compact${
          focused ? " recruit-unit-focused" : ""
        }${researchLocked ? " progression-locked" : ""}`}
      >
        <div className="structure-head">
          <strong>{unit.name}</strong>
          <span className="recruitment-tier-badge">Tier {unit.tier}</span>
        </div>
        <p className="structure-desc muted recruitment-role" title={unit.proposedRole}>
          {unit.proposedRole}
        </p>
        <div className="recruitment-hire-meta">
          <div className="recruitment-hire-meta-cost">
            <StructureCostLine
              state={state}
              officeId={officeId}
              cost={cost}
              layout="line"
              prefix=""
              inline
            />
            {orderHours > 0 ? (
              <>
                <span className="structure-cost-sep">·</span>
                <span className="recruitment-time-inline">
                  {formatQueueTimeHours(orderHours)}
                </span>
              </>
            ) : null}
          </div>
          <div className="recruitment-hire-actions">
            <label className="recruit-count-field recruit-count-inline">
              <span className="recruit-count-label">Qty</span>
              <input
                type="number"
                min={1}
                max={MAX_RECRUIT_BATCH}
                value={count}
                disabled={queueFull || researchLocked}
                onChange={(e) => {
                  const n = Math.max(
                    1,
                    Math.min(MAX_RECRUIT_BATCH, Number(e.target.value) || 1),
                  );
                  setCounts((prev) => ({ ...prev, [unit.id]: n }));
                }}
              />
            </label>
            <button
              type="button"
              className="btn primary recruitment-queue-btn"
              disabled={!affordable || queueFull || researchLocked}
              onClick={() => hire(unit.id)}
            >
              {researchLocked
                ? "Locked"
                : queueFull
                  ? "Queue full"
                  : "Queue order"}
            </button>
          </div>
        </div>
        {blocker && <p className="structure-blocker">{blocker}</p>}
      </li>
    );
  }

  return (
    <div className="main-view-panel location-view-panel">
      <LocationViewHeader
        title="Recruitment"
        description="Hire contractors at the selected office — one queue slot per order."
        state={state}
        dispatch={dispatch}
      />
      <div className="location-view-body">
        <QueueSection
          label="Hiring queue"
          count={queue.length}
          max={MAX_RECRUIT_QUEUE}
          className="location-queue-section recruitment-queue-section"
        >
          <RecruitmentQueueList
            state={state}
            jobs={queue}
            officeId={officeId}
            dispatch={dispatch}
            now={now}
          />
        </QueueSection>
        <section className="recruitment-site-staff">
          <div className="recruitment-site-staff-head">
            <h3 className="recruitment-site-staff-title">
              Staff at {OFFICE_LABELS[officeId]}
            </h3>
            <div className="location-stat recruitment-staff-stat">
              <span className="location-stat-label">On site</span>
              <strong>{formatNumber(staffTotal)}</strong>
              {pendingHires > 0 && (
                <small>{formatNumber(pendingHires)} hiring</small>
              )}
            </div>
          </div>
          <p className="recruitment-staff-summary">{staffCategorySummary}</p>
        </section>
        <details
          className="recruitment-roster-details"
          open={rosterOpen}
          onToggle={(event) =>
            setRosterOpen((event.target as HTMLDetailsElement).open)
          }
        >
          <summary className="recruitment-roster-summary">
            Unit breakdown
          </summary>
          {staffTotal > 0 ? (
            <ul className="office-site-staff-list recruitment-roster-list">
              {RECRUITMENT_UNITS.filter((unit) => (roster[unit.id] ?? 0) > 0).map(
                (unit) => (
                  <li key={unit.id}>
                    <span className="office-site-staff-role">{unit.name}</span>
                    <span className="office-site-staff-count">
                      ×{roster[unit.id] ?? 0}
                    </span>
                  </li>
                ),
              )}
            </ul>
          ) : (
            <p className="muted recruitment-roster-empty">No units at this site.</p>
          )}
        </details>
        {RECRUITMENT_CATEGORY_ORDER.map((category) => {
          const units = RECRUITMENT_UNITS.filter(
            (unit) => unit.category === category,
          );
          if (units.length === 0) return null;

          return (
            <section key={category} className="research-type-section">
              <h3 className="research-type-heading">
                {CATEGORY_LABELS[category]}
              </h3>
              <ul className="structure-list recruitment-grid">
                {units.map(renderUnitCard)}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
