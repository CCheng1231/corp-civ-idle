import { useEffect, useMemo, useState, type Dispatch } from "react";
import { rosterAt } from "../game/constants";
import { resolveOfficeLocation } from "../game/officeSelection";
import { jobDefinitionForPosting } from "../game/jobs";
import { pruneAssignmentForJob } from "../game/jobUnitTier";
import { emptyAssignmentForJob } from "./MissionCrewPicker";
import type { GameAction, GameState, JobPosting, UnitAssignment } from "../game/types";
import { GovProgramJobEngageCoach } from "./GovProgramJobEngageCoach";
import { JobPostingCard } from "./JobPostingCard";

interface MapWorldJobEngageDialogProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  posting: JobPosting;
  onClose: () => void;
  onEngaged?: (postingId: string) => void;
}

export function MapWorldJobEngageDialog({
  state,
  dispatch,
  posting,
  onClose,
  onEngaged,
}: MapWorldJobEngageDialogProps) {
  const officeId = resolveOfficeLocation(state);
  const officeRoster = rosterAt(state, officeId);
  const [crewByPosting, setCrewByPosting] = useState<
    Record<string, UnitAssignment>
  >({});

  const assignment = useMemo(() => {
    const base = emptyAssignmentForJob(
      state,
      posting.id,
      officeRoster,
      crewByPosting,
    );
    try {
      const def = jobDefinitionForPosting(posting);
      return pruneAssignmentForJob(base, def);
    } catch {
      return base;
    }
  }, [state, posting, officeRoster, crewByPosting]);

  const coachPosting =
    posting.id === state.govProgram?.growthJobCoachPostingId;
  const onGrowthJobCoach =
    state.govProgram?.growthStepId === "growth_job" && coachPosting;
  const coachEngageOpen =
    onGrowthJobCoach &&
    state.govProgram?.growthJobCoach === "map_engage_open";
  const coachEngageFacts =
    onGrowthJobCoach &&
    state.govProgram?.growthJobCoach === "map_engage_intro";
  const coachEngageFreshQty =
    onGrowthJobCoach &&
    state.govProgram?.growthJobCoach === "map_engage_crew_qty";
  const coachEngage =
    onGrowthJobCoach && state.govProgram?.growthJobCoach === "map_engage";

  useEffect(() => {
    if (!onGrowthJobCoach) return;
    const available = officeRoster.fresh_graduate ?? 0;
    if (available <= 0) return;
    setCrewByPosting((prev) => {
      if (prev[posting.id]?.fresh_graduate) return prev;
      const count = Math.min(10, available);
      return { ...prev, [posting.id]: { fresh_graduate: count } };
    });
  }, [onGrowthJobCoach, officeRoster.fresh_graduate, posting.id]);

  return (
    <div
      className="modal-backdrop map-world-job-engage-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal map-world-job-engage-dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="map-world-job-engage-title"
      >
        <header className="map-world-job-engage-head">
          <h2 id="map-world-job-engage-title">Dispatch team</h2>
          <button
            type="button"
            className="map-world-job-engage-close"
            aria-label="Cancel"
            onClick={onClose}
          >
            Cancel
          </button>
        </header>
        <div
          id={
            coachEngageOpen
              ? "gov-coach-anchor-map-job-engage-dialog"
              : undefined
          }
          className="map-world-job-engage-body"
        >
          <JobPostingCard
            state={state}
            dispatch={dispatch}
            posting={posting}
            showTower
            presentation="mapEngage"
            assignment={assignment}
            onAssignmentChange={(next) =>
              setCrewByPosting((prev) => ({
                ...prev,
                [posting.id]: next,
              }))
            }
            onEngageSuccess={() => {
              setCrewByPosting((prev) => {
                if (!prev[posting.id]) return prev;
                const next = { ...prev };
                delete next[posting.id];
                return next;
              });
              onEngaged?.(posting.id);
            }}
            coachEngageFactsHighlight={coachEngageFacts}
            coachEngageFreshQtyHighlight={coachEngageFreshQty}
            coachEngageHighlight={coachEngage}
          />
          <GovProgramJobEngageCoach state={state} dispatch={dispatch} />
        </div>
      </div>
    </div>
  );
}