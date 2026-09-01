import { useEffect, useState, type Dispatch } from "react";
import {
  MAX_RECRUIT_BATCH,
  MAX_RECRUIT_QUEUE,
  canAffordAtOffice,
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
import {
  getRecruitCategoryOpen,
  setRecruitCategoryOpen,
} from "../game/officeCategoryOpen";
import { RecruitmentQueueList } from "./StructureBuildQueueList";
import { StructureCostLine } from "./StructureCostLine";
import { TabPortraitLayout } from "./TabPortraitLayout";
import { TabSiteHeader } from "./TabSiteHeader";
import { tabQuote } from "../game/tabQuotes";
import { SceneBanner } from "./SceneBanner";
import { ProgressionCategorySection } from "./progressionUi";
import recruitmentPortrait from "../assets/Recruitment.png";
import recruitFarmingArt from "../assets/Recruit_resource.png";
import recruitDefenseArt from "../assets/Recruit_defend.jpg";
import recruitIntelArt from "../assets/Recruit_Intel.png";
import recruitSupportArt from "../assets/Recruit_Support.png";
import recruitSpecialArt from "../assets/Recruit_Special.webp";
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

const RECRUIT_CATEGORY_SCENE: Record<
  ContractorCategoryId,
  { src: string; storageKey: string }
> = {
  farming: {
    src: recruitFarmingArt,
    storageKey: "corp-civ-idle-recruit-farming-art-pan",
  },
  defense: {
    src: recruitDefenseArt,
    storageKey: "corp-civ-idle-recruit-defense-art-pan",
  },
  intel: {
    src: recruitIntelArt,
    storageKey: "corp-civ-idle-recruit-intel-art-pan",
  },
  support: {
    src: recruitSupportArt,
    storageKey: "corp-civ-idle-recruit-support-art-pan",
  },
  special: {
    src: recruitSpecialArt,
    storageKey: "corp-civ-idle-recruit-special-art-pan",
  },
};

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
  const [categoryOpen, setCategoryOpen] = useState<
    Partial<Record<ContractorCategoryId, boolean>>
  >(() => {
    const seeded: Partial<Record<ContractorCategoryId, boolean>> = {};
    for (const category of RECRUITMENT_CATEGORY_ORDER) {
      const remembered = getRecruitCategoryOpen(officeId, category);
      if (remembered !== undefined) seeded[category] = remembered;
    }
    return seeded;
  });
  const hireQueueCount = showAll
    ? recruitmentJobsForOffices(state).length
    : recruitmentJobsAtOffice(state, officeId).length;
  const queueFull = actionsLocked
    ? true
    : isRecruitmentQueueFull(state, officeId);
  const roster = rosterAt(state, officeId);
  const staffTotal = showAll
    ? totalStaffAcrossOffices(state)
    : totalWorkforce(roster);
  const unitCount = Math.round(staffTotal);
  const unitCountLabel = `${unitCount} ${unitCount === 1 ? "unit" : "units"}`;
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

  useEffect(() => {
    const seeded: Partial<Record<ContractorCategoryId, boolean>> = {};
    for (const category of RECRUITMENT_CATEGORY_ORDER) {
      const remembered = getRecruitCategoryOpen(officeId, category);
      if (remembered !== undefined) seeded[category] = remembered;
    }
    setCategoryOpen(seeded);
  }, [officeId]);

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
          emptyLabel=""
        />
      </section>
    </>
  );

  const recruitBelowPortrait = (
    <>
      <div className="recruitment-units-banner">
        <span className="recruitment-units-label">Unit breakdown</span>
        <button
          type="button"
          className="recruitment-units-count"
          aria-expanded={rosterOpen}
          aria-label={`${unitCountLabel}. ${rosterOpen ? "Hide" : "Show"} roster.`}
          onClick={() => setRosterOpen((open) => !open)}
        >
          {unitCountLabel}
        </button>
      </div>
      {rosterOpen ? (
        <div className="recruitment-roster-panel">
          {showAll ? (
            ownedOfficeIds(state).some(
              (siteId) => totalWorkforce(rosterAt(state, siteId)) > 0,
            ) ? (
              <ul className="office-site-staff-list recruitment-roster-list">
                {ownedOfficeIds(state).flatMap((siteId) => {
                  const siteRoster = rosterAt(state, siteId);
                  return RECRUITMENT_UNITS.filter(
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
                  ));
                })}
              </ul>
            ) : (
              <p className="muted recruitment-roster-empty">No units.</p>
            )
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
        </div>
      ) : null}
      {RECRUITMENT_CATEGORY_ORDER.map((category) => {
        const units = RECRUITMENT_UNITS.filter(
          (unit) => unit.category === category,
        ).filter(
          (unit) => !hideLocked || !isRecruitmentUnitLocked(state, unit),
        );
        if (units.length === 0) return null;

        const fallbackOpen = units.some(
          (unit) => !isRecruitmentUnitLocked(state, unit),
        );
        const open = categoryOpen[category] ?? fallbackOpen;

        return (
          <ProgressionCategorySection
            key={category}
            title={CATEGORY_LABELS[category]}
            defaultOpen={fallbackOpen}
            open={open}
            onOpenChange={(next) => {
              if (next === open) return;
              setRecruitCategoryOpen(officeId, category, next);
              setCategoryOpen((prev) => ({ ...prev, [category]: next }));
            }}
            maxedCount={0}
            totalCount={units.length}
            banner={
              <SceneBanner
                src={RECRUIT_CATEGORY_SCENE[category].src}
                storageKey={RECRUIT_CATEGORY_SCENE[category].storageKey}
              />
            }
          >
            <ul className="structure-list recruitment-grid">
              {units.map(renderUnitCard)}
            </ul>
          </ProgressionCategorySection>
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
