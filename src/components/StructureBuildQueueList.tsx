import { useState, type Dispatch, type ReactNode } from "react";
import {
  RESEARCH,
  STRUCTURES,
  recruitmentOrderDurationMs,
} from "../game/constants";
import { cancelRefundFromSpent } from "../game/refunds";
import { researchBuildTimeMs } from "../game/researchBalance";
import {
  formatQueueJobStatus,
  type QueueJobTiming,
  queueWaitBeforeIndex,
} from "../game/timers";
import { structureBuildTimeMs } from "../game/structureBalance";
import { unitDefinition } from "../game/unitEffects";
import type {
  GameAction,
  GameState,
  OfficeLocationId,
  ResearchJob,
  RecruitmentJob,
  StructureBuildJob,
} from "../game/types";
import type { OfficeTaggedJob } from "../game/officeSelection";
import { ConfirmDialog } from "./ConfirmDialog";

type QueueJobKind = "structure" | "research" | "recruitment";

interface PendingCancel {
  kind: QueueJobKind;
  jobId: string;
  officeId: OfficeLocationId;
  label: string;
  refund: ReturnType<typeof cancelRefundFromSpent>;
}

interface QueueSectionProps {
  label: string;
  count: number;
  max: number;
  children: ReactNode;
  className?: string;
  headerExtra?: ReactNode;
}

/** Fixed-height queue area — always rendered so upgrades do not shift layout. */
export function QueueSection({
  label,
  count,
  max,
  children,
  className,
  headerExtra,
}: QueueSectionProps) {
  return (
    <section className={`queue-section${className ? ` ${className}` : ""}`}>
      <div className="queue-section-head">
        <p className="queue-section-label muted">
          {label} {count}/{max}
        </p>
        {headerExtra}
      </div>
      {children}
    </section>
  );
}

interface QueueSlotProps {
  count: number;
  maxSlots?: number;
  emptyLabel?: string;
  children: ReactNode;
}

function QueueSlot({
  count,
  maxSlots = 2,
  emptyLabel,
  children,
}: QueueSlotProps) {
  if (count === 0 && !emptyLabel) {
    return null;
  }
  return (
    <div className="build-queue-slot" data-max-slots={maxSlots}>
      {count === 0 ? (
        <p className="muted queue-empty">{emptyLabel}</p>
      ) : (
        children
      )}
    </div>
  );
}

interface QueueRowProps {
  state: GameState;
  role: string;
  name: string;
  siteLabel?: string;
  timing: QueueJobTiming;
  waitBeforeStartMs: number;
  now: number;
  onCancel?: () => void;
  compact?: boolean;
}

function QueueRow({
  state,
  role,
  name,
  siteLabel,
  timing,
  waitBeforeStartMs,
  now,
  onCancel,
  compact = false,
}: QueueRowProps) {
  return (
    <li
      className={
        onCancel
          ? compact
            ? "build-queue-row-with-cancel build-queue-row-compact"
            : "build-queue-row-with-cancel"
          : compact
            ? "build-queue-row-compact"
            : undefined
      }
    >
      {!compact && <span className="queue-role">{role}</span>}
      <span className="queue-name">
        {siteLabel ? (
          <>
            <span className="queue-site-label">{siteLabel}</span>
            <span className="queue-site-sep" aria-hidden>
              {" "}
              ·{" "}
            </span>
          </>
        ) : null}
        {name}
      </span>
      <span className="queue-status">
        {formatQueueJobStatus(state, timing, waitBeforeStartMs, now)}
      </span>
      {onCancel && (
        <button
          type="button"
          className="btn btn-compact queue-cancel-btn"
          onClick={onCancel}
        >
          Cancel
        </button>
      )}
    </li>
  );
}

interface StructureBuildQueueListProps {
  state: GameState;
  jobs?: StructureBuildJob[];
  locationId?: OfficeLocationId;
  entries?: OfficeTaggedJob<StructureBuildJob>[];
  dispatch?: Dispatch<GameAction>;
  now?: number;
  emptyLabel?: string;
  maxSlots?: number;
  compact?: boolean;
}

export function StructureBuildQueueList({
  state,
  jobs = [],
  locationId = "hq",
  entries,
  dispatch,
  now = Date.now(),
  emptyLabel = "No builds queued.",
  maxSlots = 2,
  compact = false,
}: StructureBuildQueueListProps) {
  const [pending, setPending] = useState<PendingCancel | null>(null);
  const rows =
    entries ??
    jobs.map((job) => ({
      job,
      officeId: locationId,
      siteLabel: "",
    }));

  function requestCancel(
    job: StructureBuildJob,
    officeId: OfficeLocationId,
  ) {
    const structureName =
      STRUCTURES.find((s) => s.id === job.structureId)?.name ?? job.structureId;
    const targetLevel = job.targetLevel ?? 1;
    setPending({
      kind: "structure",
      jobId: job.id,
      officeId,
      label: `${structureName} → Lv ${targetLevel}`,
      refund: cancelRefundFromSpent(job.spentCost),
    });
  }

  function confirmCancel() {
    if (!pending || !dispatch) return;
    if (pending.kind === "structure") {
      dispatch({
        type: "CANCEL_STRUCTURE_JOB",
        locationId: pending.officeId,
        jobId: pending.jobId,
      });
    }
    setPending(null);
  }

  return (
    <>
      <QueueSlot count={rows.length} maxSlots={maxSlots} emptyLabel={emptyLabel}>
        <ul className={`build-queue${compact ? " build-queue-compact" : ""}`}>
          {(() => {
            const timings: QueueJobTiming[] = rows.map(({ job }) => ({
              completesAt: job.completesAt,
              durationMs: structureBuildTimeMs(
                job.structureId,
                job.targetLevel ?? 1,
              ),
            }));
            return rows.map(({ job, officeId: rowOfficeId, siteLabel }, index) => {
              const structureName =
                STRUCTURES.find((s) => s.id === job.structureId)?.name ??
                job.structureId;
              const targetLevel = job.targetLevel ?? 1;
              const name = `${structureName} → Lv ${targetLevel}`;
              const role = index === 0 ? "Building" : "Queued";
              return (
                <QueueRow
                  key={job.id}
                  state={state}
                  role={role}
                  name={name}
                  siteLabel={siteLabel || undefined}
                  timing={timings[index]}
                  waitBeforeStartMs={queueWaitBeforeIndex(timings, index, now)}
                  now={now}
                  onCancel={
                    dispatch
                      ? () => requestCancel(job, rowOfficeId)
                      : undefined
                  }
                  compact={compact}
                />
              );
            });
          })()}
        </ul>
      </QueueSlot>
      {pending && dispatch && (
        <ConfirmDialog
          title="Cancel build?"
          message={
            <>
              Remove <strong>{pending.label}</strong> from the build queue?
            </>
          }
          refund={pending.refund}
          onConfirm={confirmCancel}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}

interface ResearchQueueListProps {
  state: GameState;
  jobs?: ResearchJob[];
  officeId?: OfficeLocationId;
  entries?: OfficeTaggedJob<ResearchJob>[];
  dispatch: Dispatch<GameAction>;
  now?: number;
  emptyLabel?: string;
  maxSlots?: number;
  compact?: boolean;
}

export function ResearchQueueList({
  state,
  jobs = [],
  officeId = "hq",
  entries,
  dispatch,
  now = Date.now(),
  emptyLabel = "No research queued.",
  maxSlots = 2,
  compact = false,
}: ResearchQueueListProps) {
  const [pending, setPending] = useState<PendingCancel | null>(null);
  const rows =
    entries ??
    jobs.map((job) => ({
      job,
      officeId,
      siteLabel: "",
    }));

  function requestCancel(job: ResearchJob, rowOfficeId: OfficeLocationId) {
    const name =
      RESEARCH.find((r) => r.id === job.researchId)?.name ?? job.researchId;
    setPending({
      kind: "research",
      jobId: job.id,
      officeId: rowOfficeId,
      label: name,
      refund: cancelRefundFromSpent(job.spentCost),
    });
  }

  function confirmCancel() {
    if (!pending) return;
    dispatch({
      type: "CANCEL_RESEARCH_JOB",
      officeId: pending.officeId,
      jobId: pending.jobId,
    });
    setPending(null);
  }

  return (
    <>
      <QueueSlot count={rows.length} maxSlots={maxSlots} emptyLabel={emptyLabel}>
        <ul className={`build-queue${compact ? " build-queue-compact" : ""}`}>
          {(() => {
            const timings: QueueJobTiming[] = rows.map(({ job }) => ({
              completesAt: job.completesAt,
              durationMs: researchBuildTimeMs(job.researchId, job.targetLevel),
            }));
            return rows.map(({ job, officeId: rowOfficeId, siteLabel }, index) => {
              const name =
                RESEARCH.find((r) => r.id === job.researchId)?.name ??
                job.researchId;
              const role = index === 0 ? "Researching" : "Queued";
              return (
                <QueueRow
                  key={job.id}
                  state={state}
                  role={role}
                  name={`${name} → Lv ${job.targetLevel}`}
                  siteLabel={siteLabel || undefined}
                  timing={timings[index]}
                  waitBeforeStartMs={queueWaitBeforeIndex(timings, index, now)}
                  now={now}
                  onCancel={() => requestCancel(job, rowOfficeId)}
                  compact={compact}
                />
              );
            });
          })()}
        </ul>
      </QueueSlot>
      {pending && (
        <ConfirmDialog
          title="Cancel research?"
          message={
            <>
              Remove <strong>{pending.label}</strong> from the research queue?
            </>
          }
          refund={pending.refund}
          onConfirm={confirmCancel}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}

interface RecruitmentQueueListProps {
  state: GameState;
  jobs?: RecruitmentJob[];
  officeId?: OfficeLocationId;
  entries?: OfficeTaggedJob<RecruitmentJob>[];
  dispatch: Dispatch<GameAction>;
  now?: number;
  emptyLabel?: string;
  maxSlots?: number;
  compact?: boolean;
}

export function RecruitmentQueueList({
  state,
  jobs = [],
  officeId = "hq",
  entries,
  dispatch,
  now = Date.now(),
  emptyLabel = "No hires queued.",
  maxSlots = 2,
  compact = false,
}: RecruitmentQueueListProps) {
  const [pending, setPending] = useState<PendingCancel | null>(null);

  const rows = (
    entries ??
    jobs.map((job) => ({
      job,
      officeId,
      siteLabel: "",
    }))
  ).sort(
    (a, b) =>
      (a.job.completesAt ?? Number.MAX_SAFE_INTEGER) -
      (b.job.completesAt ?? Number.MAX_SAFE_INTEGER),
  );

  function requestCancel(
    job: RecruitmentJob,
    rowOfficeId: OfficeLocationId,
    unitName: string,
  ) {
    const orderCount = job.count ?? 1;
    setPending({
      kind: "recruitment",
      jobId: job.id,
      officeId: rowOfficeId,
      label: `${orderCount}× ${unitName}`,
      refund: cancelRefundFromSpent(job.spentCost),
    });
  }

  function confirmCancel() {
    if (!pending) return;
    dispatch({
      type: "CANCEL_RECRUITMENT_JOB",
      jobId: pending.jobId,
    });
    setPending(null);
  }

  return (
    <>
      <QueueSlot count={rows.length} maxSlots={maxSlots} emptyLabel={emptyLabel}>
        <ul className={`build-queue${compact ? " build-queue-compact" : ""}`}>
          {(() => {
            const timings: QueueJobTiming[] = rows.map(({ job }) => ({
              completesAt: job.completesAt,
              durationMs: recruitmentOrderDurationMs(job.count ?? 1),
            }));
            return rows.map(({ job, officeId: rowOfficeId, siteLabel }, index) => {
              const unit = unitDefinition(job.unitId);
              const orderCount = job.count ?? 1;
              const role =
                index === 0 && job.completesAt !== null ? "Hiring" : "Queued";
              return (
                <QueueRow
                  key={job.id}
                  state={state}
                  role={role}
                  name={`${orderCount}× ${unit.name}`}
                  siteLabel={siteLabel || undefined}
                  timing={timings[index]}
                  waitBeforeStartMs={queueWaitBeforeIndex(timings, index, now)}
                  now={now}
                  onCancel={() => requestCancel(job, rowOfficeId, unit.name)}
                  compact={compact}
                />
              );
            });
          })()}
        </ul>
      </QueueSlot>
      {pending && (
        <ConfirmDialog
          title="Cancel hire?"
          message={
            <>
              Remove <strong>{pending.label}</strong> from the hiring queue?
            </>
          }
          refund={pending.refund}
          onConfirm={confirmCancel}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}
