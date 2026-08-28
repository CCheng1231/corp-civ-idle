import { useEffect, useState, type Dispatch } from "react";
import {
  MAX_RECRUIT_BATCH,
  MAX_RECRUIT_QUEUE,
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
import type { GameAction, GameState, OfficeLocationId, UnitId } from "../game/types";
import { RecruitmentQueueList } from "./StructureBuildQueueList";
import { StructureCostLine } from "./StructureCostLine";
import { TabPortraitLayout } from "./TabPortraitLayout";
import { TabSiteHeader } from "./TabSiteHeader";
import { tabQuote } from "../game/tabQuotes";
import recruitmentPortrait from "../assets/Recruitment.png";
import { officeDisplayName, ownedOfficeIds } from "../game/mapWorld";
import {
  isAllOfficesSelected,
  recruitmentJobsForOffices,
  resolveOfficeLocation,
  totalStaffAcrossOffices,
} from "../game/officeSelection";

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

function isRecruitmentUnitLocked(
  state: GameState,
  unit: RecruitmentUnitDefinition,
): boolean {
  return (
    unit.id === "branch_manager" &&
    (state.researchLevels.branch_management ?? 0) < 1
  );
}

function recruitmentBlockerMessage(researchLocked: boolean): string | null {
  if (researchLocked) return "Requires Branch Management research";
  return null;
}

export function RecruitmentView({ state, dispatch }: RecruitmentViewProps) {
  const showAll = isAllOfficesSelected(state.selectedOffice);
  const officeId: OfficeLocationId = resolveOfficeLocation(state);
  const actionsLocked = showAll;
  const now = Date.now();
  const [counts, setCounts] = useState<Partial<Record<UnitId, number>>>({});
  const [rosterOpen, setRosterOpen] = useState(false);
  const [hideLocked, setHideLocked] = useState(false);
  const hireQueueCount = showAll
    ? recruitmentJobsForOffices(state).length
    : recruitmentJobsAtOffice(state, officeId).length;
  const pendingHires = showAll
    ? recruitmentJobsForOffices(state).reduce(
        (sum, entry) => sum + (entry.job.count ?? 1),
        0,
      )
    : recruitmentJobsAtOffice(state, officeId).reduce(
        (sum, job) => sum + (job.count ?? 1),
        0,
      );
  const queueFull = actionsLocked
    ? true
    : isRecruitmentQueueFull(state, officeId);
  const roster = rosterAt(state, officeId);
  const staffTotal = showAll
    ? totalStaffAcrossOffices(state)
    : totalWorkforce(roster);
  const staffCategorySummary = showAll
    ? ownedOfficeIds(state)
        .map((siteId) => {
          const siteRoster = rosterAt(state, siteId);
          const summary = officeStaffCategorySummary(siteRoster);
          return summary === "No units at this site yet"
            ? null
            : `${officeDisplayName(state, siteId)}: ${summary}`;
        })
        .filter(Boolean)
        .join(" · ") || "No units across offices yet"
    : officeStaffCategorySummary(roster);
  const focusUnitId = state.recruitFocusUnitId ?? null;
  const portraitStorageKey = "corp-civ-idle-recruitment-portrait-size";

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
    const researchLocked = isRecruitmentUnitLocked(state, unit);
    const affordable =
      !actionsLocked &&
      !researchLocked &&
      canAffordAtOffice(state, officeId, cost);
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
                disabled={actionsLocked || queueFull || researchLocked}
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
              {actionsLocked
                ? "Pick an office"
                : researchLocked
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

  const recruitBesidePortrait = (
    <>
      <TabSiteHeader title="Recruit" state={state} dispatch={dispatch} />
      <section className="location-view-section tab-queue-section tab-compact-queue">
        <div className="tab-queue-heading">
          <h3>Hiring in progress</h3>
          <div className="tab-queue-heading-actions">
            <span
              className="tab-queue-count muted"
              aria-label={`Hiring queue ${hireQueueCount}${showAll ? "" : ` of ${MAX_RECRUIT_QUEUE}`}`}
            >
              {hireQueueCount}
              {showAll ? "" : `/${MAX_RECRUIT_QUEUE}`}
            </span>
            <label className="progression-hide-completed-check tab-queue-filter">
              <input
                type="checkbox"
                checked={hideLocked}
                onChange={(event) => setHideLocked(event.target.checked)}
              />
              Hide locked
            </label>
          </div>
        </div>
        <RecruitmentQueueList
          state={state}
          {...(showAll
            ? {
                entries: recruitmentJobsForOffices(state),
                maxSlots: ownedOfficeIds(state).length * MAX_RECRUIT_QUEUE,
              }
            : {
                jobs: recruitmentJobsAtOffice(state, officeId),
                officeId,
              })}
          dispatch={dispatch}
          now={now}
          compact
          emptyLabel="No hires queued."
        />
      </section>
      <section className="recruitment-staff-beside" aria-label="Staff on site">
        <div className="recruitment-staff-beside-row">
          <span className="recruitment-staff-beside-label">
            {showAll ? "Firm-wide" : "On site"}
          </span>
          <strong className="recruitment-staff-beside-total">
            {formatNumber(staffTotal)}
          </strong>
          {pendingHires > 0 && (
            <span className="recruitment-staff-beside-pending">
              +{formatNumber(pendingHires)} hiring
            </span>
          )}
        </div>
        <p className="recruitment-staff-beside-summary">{staffCategorySummary}</p>
      </section>
    </>
  );

  const recruitBelowPortrait = (
    <>
      <details
        className="recruitment-roster-details"
        open={rosterOpen}
        onToggle={(event) =>
          setRosterOpen((event.target as HTMLDetailsElement).open)
        }
      >
        <summary className="recruitment-roster-summary">Unit breakdown</summary>
        {showAll ? (
          ownedOfficeIds(state).map((siteId) => {
            const siteRoster = rosterAt(state, siteId);
            const siteTotal = totalWorkforce(siteRoster);
            if (siteTotal <= 0) return null;
            return (
              <ul
                key={siteId}
                className="office-site-staff-list recruitment-roster-list"
              >
                {RECRUITMENT_UNITS.filter(
                  (unit) => (siteRoster[unit.id] ?? 0) > 0,
                ).map((unit) => (
                  <li key={`${siteId}-${unit.id}`}>
                    <span className="office-site-staff-role">
                      {officeDisplayName(state, siteId)} · {unit.name}
                    </span>
                    <span className="office-site-staff-count">
                      ×{siteRoster[unit.id] ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            );
          })
        ) : staffTotal > 0 ? (
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
        ).filter(
          (unit) => !hideLocked || !isRecruitmentUnitLocked(state, unit),
        );
        if (units.length === 0) return null;

        return (
          <section key={category} className="research-type-section">
            <h3 className="research-type-heading">{CATEGORY_LABELS[category]}</h3>
            <ul className="structure-list recruitment-grid">
              {units.map(renderUnitCard)}
            </ul>
          </section>
        );
      })}
    </>
  );

  return (
    <div className="main-view-panel location-view-panel recruitment-view">
      <div className="location-view-body">
        <TabPortraitLayout
          src={recruitmentPortrait}
          storageKey={portraitStorageKey}
          quote={tabQuote(state, "recruitment")}
          portraitLayout="stretch"
          parallaxScroll={false}
          portraitLocked={false}
          allowPortraitResize={false}
          className="tab-portrait-fit"
        >
          {recruitBesidePortrait}
        </TabPortraitLayout>
        <div className="tab-below-portrait">{recruitBelowPortrait}</div>
      </div>
    </div>
  );
}
