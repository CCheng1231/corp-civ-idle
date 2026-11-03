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
import { recruitmentUnitProgressionLockNav } from "../game/progressionLockNav";
import type { ProgressionLockNavTarget } from "../game/progressionLockNav";
import type { RecruitmentUnitDefinition } from "../game/recruitmentData";
import { RECRUITMENT_UNITS } from "../game/recruitmentData";
import type { ContractorCategoryId } from "../game/types";
import { formatQueueTimeHours } from "../game/timers";
import type { GameAction, GameState, OfficeLocationId, UnitId } from "../game/types";
import {
  getRecruitCategoryOpen,
  setRecruitCategoryOpen,
} from "../game/officeCategoryOpen";
import { CompactQueueHeading } from "./CompactQueueHeading";
import { RecruitmentQueueList } from "./StructureBuildQueueList";
import { StructureCostLine } from "./StructureCostLine";
import { TabPortraitLayout } from "./TabPortraitLayout";
import { TabSiteHeader } from "./TabSiteHeader";
import { HubSyncedTabBackground } from "./HubSyncedTabBackground";
import { HubSyncedTabScrollBody } from "./HubSyncedTabScrollBody";
import { SceneBanner } from "./SceneBanner";
import { ProgressionCategorySection, ProgressionNameButton } from "./progressionUi";
import { ProgressionDetailDialog } from "./ProgressionDetailDialog";
import { buildRecruitmentUnitDetailModel } from "./progressionDetailModel";
import { recruitContractorCategoryBanner } from "../game/recruitContractorCategoryArt";
import { officeDisplayName, ownedOfficeIds } from "../game/mapWorld";
import {
  isAllOfficesSelected,
  resolveOfficeLocation,
  totalStaffAcrossOffices,
} from "../game/officeSelection";
import { unitPortraitSrc } from "../game/unitPortraitAssets";
import { UnitCardPortrait } from "./UnitCardPortrait";
import { ProgressionCardPortraitColumn } from "./ProgressionCardPortraitColumn";
import { ProgressionLockRequirements } from "./ProgressionLockRequirements";

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

const RECRUIT_CATEGORY_SCENE = Object.fromEntries(
  (
    [
      "farming",
      "defense",
      "intel",
      "support",
      "special",
    ] as const satisfies readonly ContractorCategoryId[]
  ).map((category) => {
    const banner = recruitContractorCategoryBanner(category);
    return [
      category,
      {
        src: banner.src,
        storageKey: banner.storageKey,
        panZoomFactor: banner.crop.panZoomFactor,
        focalYPercent: banner.crop.focalYPercent,
        focalXPercent: banner.crop.focalXPercent,
      },
    ] as const;
  }),
) as Record<
  ContractorCategoryId,
  {
    src: string;
    storageKey: string;
    panZoomFactor: number;
    focalYPercent: number;
    focalXPercent: number;
  }
>;

function isRecruitmentUnitLocked(
  state: GameState,
  unit: RecruitmentUnitDefinition,
): boolean {
  return recruitmentUnitProgressionLockNav(state, unit.id).length > 0;
}

function recruitmentLockedButtonTitle(
  lockLines: ProgressionLockNavTarget[],
): string | undefined {
  if (lockLines.length === 0) return undefined;
  return lockLines.map((line) => line.label).join(" · ");
}

export function RecruitmentView({ state, dispatch }: RecruitmentViewProps) {
  const showAll = isAllOfficesSelected(state.selectedOffice);
  const officeId: OfficeLocationId = resolveOfficeLocation(state);
  const actionsLocked = showAll;
  const now = Date.now();
  const [counts, setCounts] = useState<Partial<Record<UnitId, number>>>({});
  const [rosterOpen, setRosterOpen] = useState(false);
  const [hideLocked, setHideLocked] = useState(false);
  const [detailUnit, setDetailUnit] = useState<RecruitmentUnitDefinition | null>(
    null,
  );
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
  const hireQueueCount = recruitmentJobsAtOffice(state, officeId).length;
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

  function collapseAllRecruitCategories() {
    for (const category of RECRUITMENT_CATEGORY_ORDER) {
      setRecruitCategoryOpen(officeId, category, false);
    }
    setCategoryOpen((prev) => {
      const next = { ...prev };
      for (const category of RECRUITMENT_CATEGORY_ORDER) {
        next[category] = false;
      }
      return next;
    });
  }

  function renderUnitCard(unit: RecruitmentUnitDefinition) {
    const count = counts[unit.id] ?? 1;
    const cost = recruitBatchCost(unit.id, count);
    const lockLines = recruitmentUnitProgressionLockNav(state, unit.id);
    const researchLocked = lockLines.length > 0;
    const affordable =
      !actionsLocked &&
      !researchLocked &&
      canAffordAtOffice(state, officeId, cost);
    const orderHours = recruitmentOrderBuildTimeHours(count);
    const lockedTitle = recruitmentLockedButtonTitle(lockLines);

    const focused = focusUnitId === unit.id;
    const portraitSrc = unitPortraitSrc(unit.id, state.settings);

    const headBlock = (
      <div className="structure-head">
        <ProgressionNameButton
          name={unit.name}
          onClick={() => setDetailUnit(unit)}
        />
        <span className="recruitment-tier-badge">Tier {unit.tier}</span>
      </div>
    );

    const hireMetaBlock = (
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
          <span
            className="recruitment-queue-btn-hint-wrap"
            title={lockedTitle}
          >
            <button
              type="button"
              className="btn primary recruitment-queue-btn"
              disabled={!affordable || queueFull || researchLocked}
              title={lockedTitle}
              aria-label={
                researchLocked
                  ? `Locked. ${lockedTitle ?? "Requirements not met"}`
                  : undefined
              }
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
          </span>
        </div>
      </div>
    );

    return (
      <li
        key={unit.id}
        id={`recruit-unit-${unit.id}`}
        className={`structure-card structure-card-upgrade recruitment-card-compact recruitment-card-unit-${unit.id}${
          portraitSrc ? " recruitment-card-with-portrait" : ""
        }${focused ? " recruit-unit-focused" : ""}${
          researchLocked ? " progression-locked" : ""
        }`}
      >
        {portraitSrc ? (
          <div className="recruitment-card-split">
            <ProgressionCardPortraitColumn
              portrait={
                <UnitCardPortrait
                  unitId={unit.id}
                  src={portraitSrc}
                  settings={state.settings}
                />
              }
              lockLines={lockLines}
              dispatch={dispatch}
              showLockOverlay={researchLocked}
            />
            <div className="recruitment-card-main">
              {headBlock}
              {hireMetaBlock}
              <p
                className="structure-desc muted recruitment-role recruitment-role-footer"
                title={unit.proposedRole}
              >
                {unit.proposedRole}
              </p>
            </div>
          </div>
        ) : (
          <>
            {headBlock}
            <p
              className="structure-desc muted recruitment-role"
              title={unit.proposedRole}
            >
              {unit.proposedRole}
            </p>
            {researchLocked ? (
              <ProgressionLockRequirements
                lines={lockLines}
                dispatch={dispatch}
              />
            ) : null}
            {hireMetaBlock}
          </>
        )}
      </li>
    );
  }

  const recruitBesidePortrait = (
    <>
      <TabSiteHeader homeHubTab="recruitment" state={state} dispatch={dispatch} />
      {showAll ? (
        ownedOfficeIds(state).map((siteId) => {
          const siteQueue = recruitmentJobsAtOffice(state, siteId);
          return (
            <section
              key={siteId}
              className="location-view-section tab-queue-section tab-compact-queue"
            >
              <div className="tab-queue-heading">
                <h3>{officeDisplayName(state, siteId)}</h3>
                <span
                  className="tab-queue-count muted"
                  aria-label={`Hiring queue ${siteQueue.length} of ${MAX_RECRUIT_QUEUE}`}
                >
                  {siteQueue.length}/{MAX_RECRUIT_QUEUE}
                </span>
              </div>
              <RecruitmentQueueList
                state={state}
                jobs={siteQueue}
                officeId={siteId}
                dispatch={dispatch}
                now={now}
                compact
                emptyLabel=""
              />
            </section>
          );
        })
      ) : (
        <section className="location-view-section tab-queue-section tab-compact-queue">
          <CompactQueueHeading
            title="Hiring in progress"
            count={`${hireQueueCount}/${MAX_RECRUIT_QUEUE}`}
            countAriaLabel={`Hiring queue ${hireQueueCount} of ${MAX_RECRUIT_QUEUE}`}
            hideLabel="Hide locked"
            hideChecked={hideLocked}
            onHideChange={setHideLocked}
          />
          <RecruitmentQueueList
            state={state}
            jobs={recruitmentJobsAtOffice(state, officeId)}
            officeId={officeId}
            dispatch={dispatch}
            now={now}
            compact
            emptyLabel=""
          />
        </section>
      )}
    </>
  );

  const recruitBelowPortrait = (
    <>
      <div className="recruitment-units-banner">
        <div className="recruitment-units-banner-row">
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
      </div>
      <div className="office-structures-catalog-toolbar">
        <button
          type="button"
          className="office-collapse-all"
          onClick={collapseAllRecruitCategories}
        >
          Collapse all
        </button>
      </div>
      {RECRUITMENT_CATEGORY_ORDER.map((category) => {
        const units = RECRUITMENT_UNITS.filter(
          (unit) => unit.category === category,
        ).filter(
          (unit) => !hideLocked || !isRecruitmentUnitLocked(state, unit),
        );
        if (units.length === 0) return null;

        const open = categoryOpen[category] ?? false;

        return (
          <ProgressionCategorySection
            key={category}
            title={CATEGORY_LABELS[category]}
            defaultOpen={false}
            open={open}
            onOpenChange={(next) => {
              if (next === open) return;
              setRecruitCategoryOpen(officeId, category, next);
              setCategoryOpen((prev) => ({ ...prev, [category]: next }));
            }}
            maxedCount={0}
            totalCount={units.length}
            bannerInSummary
            banner={
              <SceneBanner
                src={RECRUIT_CATEGORY_SCENE[category].src}
                storageKey={RECRUIT_CATEGORY_SCENE[category].storageKey}
                panZoomFactor={RECRUIT_CATEGORY_SCENE[category].panZoomFactor}
                focalYPercent={RECRUIT_CATEGORY_SCENE[category].focalYPercent}
                focalXPercent={RECRUIT_CATEGORY_SCENE[category].focalXPercent}
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
    <div className="main-view-panel location-view-panel recruitment-view hub-synced-tab-view">
      <HubSyncedTabBackground chiefId={state.chiefOfStaffId} />
      <HubSyncedTabScrollBody>
        <TabPortraitLayout
          storageKey="corp-civ-idle-recruitment-portrait-size"
          portraitSpacer
          portraitLayout="stretch"
          parallaxScroll={false}
          portraitLocked={false}
          allowPortraitResize={false}
          className="tab-portrait-fit"
        >
          {recruitBesidePortrait}
        </TabPortraitLayout>
        <div className="tab-below-portrait">{recruitBelowPortrait}</div>
      </HubSyncedTabScrollBody>
      {detailUnit ? (
        <ProgressionDetailDialog
          {...buildRecruitmentUnitDetailModel(detailUnit, {
            locked: isRecruitmentUnitLocked(state, detailUnit),
            requirement: isRecruitmentUnitLocked(state, detailUnit)
              ? recruitmentUnitProgressionLockNav(state, detailUnit.id)
                  .map((line) => line.label)
                  .join(" · ")
              : undefined,
          })}
          onClose={() => setDetailUnit(null)}
        />
      ) : null}
    </div>
  );
}
