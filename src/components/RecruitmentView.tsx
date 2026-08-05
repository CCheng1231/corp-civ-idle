import { useEffect, useState, type Dispatch } from "react";
import {
  MAX_RECRUIT_BATCH,
  MAX_RECRUIT_QUEUE,
  OFFICE_LABELS,
  canAffordAtOffice,
  formatNumber,
  isRecruitmentQueueFull,
  powerAvailable,
  recruitBatchCost,
  recruitmentJobsAtOffice,
  recruitmentOrderBuildTimeHours,
  rosterAt,
  splitResourceCost,
} from "../game/constants";
import { RECRUITMENT_UNITS } from "../game/recruitmentData";
import type { RecruitmentUnitDefinition } from "../game/recruitmentData";
import { formatQueueTimeHours } from "../game/timers";
import type { GameAction, GameState, UnitId } from "../game/types";
import { RecruitmentQueueList, QueueSection } from "./StructureBuildQueueList";
import { StructureCostLine } from "./StructureCostLine";
import { LocationViewHeader } from "./LocationViewHeader";

interface RecruitmentViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const CATEGORY_LABELS: Record<string, string> = {
  farming: "Resource Farming",
  defense: "Protection / Defense",
  intel: "Intel / Scouting",
  support: "Support Units",
  special: "Special",
};

const RECRUITMENT_TIERS = [
  ...new Set(RECRUITMENT_UNITS.map((unit) => unit.tier)),
].sort((a, b) => a - b);

export function RecruitmentView({ state, dispatch }: RecruitmentViewProps) {
  const officeId = state.selectedOffice;
  const now = Date.now();
  const loc = state.locationStats[officeId];
  const [counts, setCounts] = useState<Partial<Record<UnitId, number>>>({});
  const queue = recruitmentJobsAtOffice(state, officeId);
  const queueFull = isRecruitmentQueueFull(state, officeId);
  const roster = rosterAt(state, officeId);
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
    const { power } = splitResourceCost(cost);
    const orderHours = recruitmentOrderBuildTimeHours(count);
    const blocked = researchLocked
      ? "Requires Branch Management research"
      : queueFull
        ? "Hiring queue full (2 orders) at this site"
        : power > powerAvailable(loc)
          ? `Need ${power} Power (${formatNumber(powerAvailable(loc))} free)`
          : null;

    const focused = focusUnitId === unit.id;
    return (
      <li
        key={unit.id}
        id={`recruit-unit-${unit.id}`}
        className={`structure-card structure-card-upgrade${
          focused ? " recruit-unit-focused" : ""
        }`}
      >
        <div className="structure-head">
          <strong>{unit.name}</strong>
        </div>
        <p className="recruitment-flavor">{CATEGORY_LABELS[unit.category]}</p>
        <div className="structure-upgrade-preview">
          <div className="structure-upgrade-preview-foot">
            <StructureCostLine
              state={state}
              officeId={officeId}
              cost={cost}
              layout="stack"
              heading="Cost"
            />
            {orderHours > 0 ? (
              <div className="structure-upgrade-time">
                <span className="structure-upgrade-preview-label">Time</span>
                <span className="structure-upgrade-preview-value">
                  {formatQueueTimeHours(orderHours)}
                </span>
              </div>
            ) : null}
          </div>
        </div>
        <p className="structure-desc muted">{unit.proposedRole}</p>
        <label className="recruit-count-field">
          Hire count
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
        {blocked && <p className="structure-blocker">{blocked}</p>}
        <button
          type="button"
          className="btn primary"
          disabled={!affordable || queueFull || researchLocked}
          onClick={() => hire(unit.id)}
        >
          {researchLocked
            ? "Locked"
            : queueFull
              ? "Queue full"
              : `Queue order (${count})`}
        </button>
      </li>
    );
  }

  return (
    <div className="main-view-panel location-view-panel">
      <LocationViewHeader
        title="Recruitment"
        description={
          <>
            Hire contractors at the selected office. Each batch uses one queue
            slot (max {MAX_RECRUIT_QUEUE} orders per site). All units in an
            order arrive when it finishes.
          </>
        }
        state={state}
        dispatch={dispatch}
      />
      <div className="location-view-body">
      <section className="recruitment-roster" aria-label="Units at this office">
        <h3 className="recruitment-roster-heading">
          Units at {OFFICE_LABELS[officeId]}
        </h3>
        {RECRUITMENT_TIERS.map((tier) => {
          const ownedAtTier = RECRUITMENT_UNITS.filter(
            (unit) => unit.tier === tier && (roster[unit.id] ?? 0) > 0,
          );
          if (ownedAtTier.length === 0) return null;
          return (
            <div key={tier} className="recruitment-roster-tier">
              <h4 className="recruitment-roster-tier-label">Tier {tier}</h4>
              <ul className="office-site-staff-list recruitment-roster-list">
                {ownedAtTier.map((unit) => (
                  <li key={unit.id}>
                    <span className="office-site-staff-role">{unit.name}</span>
                    <span className="office-site-staff-count">
                      ×{roster[unit.id] ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {RECRUITMENT_UNITS.every((unit) => (roster[unit.id] ?? 0) <= 0) && (
          <p className="muted recruitment-roster-empty">No units at this site.</p>
        )}
      </section>
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
      {RECRUITMENT_TIERS.map((tier) => (
        <section key={tier} className="recruitment-tier-section">
          <h3 className="recruitment-tier-heading">Tier {tier}</h3>
          <ul className="structure-list research-grid office-structure-grid">
            {RECRUITMENT_UNITS.filter((unit) => unit.tier === tier).map(
              renderUnitCard,
            )}
          </ul>
        </section>
      ))}
      </div>
    </div>
  );
}
