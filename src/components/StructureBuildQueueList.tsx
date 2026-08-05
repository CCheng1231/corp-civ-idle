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
  emptyLabel: string;
  children: ReactNode;
}

function QueueSlot({
  count,
  maxSlots = 2,
  emptyLabel,
  children,
}: QueueSlotProps) {
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
  timing: QueueJobTiming;
  waitBeforeStartMs: number;
  now: number;
  onCancel?: () => void;
}

function QueueRow({
  state,
  role,
  name,
  timing,
  waitBeforeStartMs,
  now,
  onCancel,
}: QueueRowProps) {
  return (
    <li className={onCancel ? "build-queue-row-with-cancel" : undefined}>
      <span className="queue-role">{role}</span>
      <span className="queue-name">{name}</span>
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
  jobs: StructureBuildJob[];
  locationId: OfficeLocationId;
  dispatch?: Dispatch<GameAction>;
  now?: number;
  emptyLabel?: string;
  maxSlots?: number;
}

export function StructureBuildQueueList({
  state,
  jobs,
  locationId,
  dispatch,
  now = Date.now(),
  emptyLabel = "No builds queued.",
  maxSlots = 2,
}: StructureBuildQueueListProps) {
  const [pending, setPending] = useState<PendingCancel | null>(null);

  function requestCancel(job: StructureBuildJob) {
    const structureName =
      STRUCTURES.find((s) => s.id === job.structureId)?.name ?? job.structureId;
    const targetLevel = job.targetLevel ?? 1;
    setPending({
      kind: "structure",
      jobId: job.id,
      officeId: locationId,
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
      <QueueSlot count={jobs.length} maxSlots={maxSlots} emptyLabel={emptyLabel}>
        <ul className="build-queue">
          {(() => {
            const timings: QueueJobTiming[] = jobs.map((job) => ({
              completesAt: job.completesAt,
              durationMs: structureBuildTimeMs(
                job.structureId,
                job.targetLevel ?? 1,
              ),
            }));
            return jobs.map((job, index) => {
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
                  timing={timings[index]}
                  waitBeforeStartMs={queueWaitBeforeIndex(timings, index, now)}
                  now={now}
                  onCancel={dispatch ? () => requestCancel(job) : undefined}
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
  jobs: ResearchJob[];
  officeId: OfficeLocationId;
  dispatch: Dispatch<GameAction>;
  now?: number;
  emptyLabel?: string;
  maxSlots?: number;
}

export function ResearchQueueList({
  state,
  jobs,
  officeId,
  dispatch,
  now = Date.now(),
  emptyLabel = "No research queued.",
  maxSlots = 2,
}: ResearchQueueListProps) {
  const [pending, setPending] = useState<PendingCancel | null>(null);

  function requestCancel(job: ResearchJob) {
    const name =
      RESEARCH.find((r) => r.id === job.researchId)?.name ?? job.researchId;
    setPending({
      kind: "research",
      jobId: job.id,
      officeId,
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
      <QueueSlot count={jobs.length} maxSlots={maxSlots} emptyLabel={emptyLabel}>
        <ul className="build-queue">
          {(() => {
            const timings: QueueJobTiming[] = jobs.map((job) => ({
              completesAt: job.completesAt,
              durationMs: researchBuildTimeMs(job.researchId, job.targetLevel),
            }));
            return jobs.map((job, index) => {
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
                  timing={timings[index]}
                  waitBeforeStartMs={queueWaitBeforeIndex(timings, index, now)}
                  now={now}
                  onCancel={() => requestCancel(job)}
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
  jobs: RecruitmentJob[];
  officeId: OfficeLocationId;
  dispatch: Dispatch<GameAction>;
  now?: number;
  emptyLabel?: string;
  maxSlots?: number;
}

export function RecruitmentQueueList({
  state,
  jobs,
  officeId,
  dispatch,
  now = Date.now(),
  emptyLabel = "No hires queued.",
  maxSlots = 2,
}: RecruitmentQueueListProps) {
  const [pending, setPending] = useState<PendingCancel | null>(null);

  const sorted = [...jobs].sort(
    (a, b) =>
      (a.completesAt ?? Number.MAX_SAFE_INTEGER) -
      (b.completesAt ?? Number.MAX_SAFE_INTEGER),
  );

  function requestCancel(job: RecruitmentJob, unitName: string) {
    const orderCount = job.count ?? 1;
    setPending({
      kind: "recruitment",
      jobId: job.id,
      officeId,
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
      <QueueSlot count={sorted.length} maxSlots={maxSlots} emptyLabel={emptyLabel}>
        <ul className="build-queue">
          {(() => {
            const timings: QueueJobTiming[] = sorted.map((job) => ({
              completesAt: job.completesAt,
              durationMs: recruitmentOrderDurationMs(job.count ?? 1),
            }));
            return sorted.map((job, index) => {
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
                  timing={timings[index]}
                  waitBeforeStartMs={queueWaitBeforeIndex(timings, index, now)}
                  now={now}
                  onCancel={() => requestCancel(job, unit.name)}
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
