import { useState, type Dispatch } from "react";
import {
  OFFICE_LABELS,
  canAffordAtOffice,
  formatNumber,
  isProjectUnlocked,
  powerAvailable,
  rosterAt,
  splitResourceCost,
} from "../game/constants";
import {
  OFFICE_TOWERS,
  REGION_LABELS,
  projectsForTower,
  towerById,
} from "../game/mapWorld";
import { canAssignFromRoster } from "../game/unitEffects";
import {
  MissionCrewPicker,
  emptyAssignmentForProject,
} from "./MissionCrewPicker";
import type { GameAction, GameState, ProjectDefinition, UnitAssignment } from "../game/types";

function mergedProjectBid(project: ProjectDefinition) {
  return {
    ...project.minBid,
    connection: (project.minBid.connection ?? 0) + 2,
  };
}

function formatCost(cost: ProjectDefinition["totalPayout"]) {
  return Object.entries(cost)
    .map(([k, v]) => `${k} ${formatNumber(v ?? 0)}`)
    .join(" · ");
}

function submitContractLabel(
  state: GameState,
  officeId: GameState["selectedOffice"],
  project: ProjectDefinition,
  assignment: UnitAssignment,
  busy: boolean,
): string {
  if (busy) return "Crew busy (job in progress)";
  if (!state.selectedTowerId || state.selectedTowerId !== project.towerId) {
    return "Select this tower on the map";
  }

  const roster = rosterAt(state, officeId);
  if (!canAssignFromRoster(roster, assignment)) {
    return "Assign at least 1 farming unit";
  }

  if (state.settings.ignoreCosts) return "Take contract";

  const merged = mergedProjectBid(project);
  const { global, power } = splitResourceCost(merged);

  for (const [key, amount] of Object.entries(global)) {
    const k = key as keyof GameState["resources"];
    const need = amount ?? 0;
    if (state.resources[k] < need) {
      return `Need ${need.toFixed(need < 10 ? 1 : 0)} ${k} (have ${state.resources[k].toFixed(1)})`;
    }
  }

  const freePower = powerAvailable(state.locationStats[officeId]);
  if (power > freePower) {
    return `Need ${power} power at ${OFFICE_LABELS[officeId]} (${formatNumber(freePower)} free)`;
  }

  return "Take contract";
}

interface ProjectPanelProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function ProjectPanel({ state, dispatch }: ProjectPanelProps) {
  const busy = Boolean(state.activeProject);
  const officeId = state.selectedOffice;
  const officeRoster = rosterAt(state, officeId);
  const towerId = state.selectedTowerId ?? "metro_central";
  const tower = towerById(towerId);
  const [crewByProject, setCrewByProject] = useState<
    Record<string, UnitAssignment>
  >({});

  function assignmentFor(projectId: string): UnitAssignment {
    return emptyAssignmentForProject(projectId, officeRoster, crewByProject);
  }

  function startProject(project: ProjectDefinition) {
    dispatch({
      type: "START_PROJECT",
      projectId: project.id,
      bid: { connection: 2 },
      crewAssigned: assignmentFor(project.id),
    });
  }

  const towerProjects = projectsForTower(towerId);
  const lockedProjects = towerProjects.filter((p) => !isProjectUnlocked(state, p));

  return (
    <section className="project-panel">
      <h2>Company projects — {tower.name}</h2>
      <p className="muted">
        Each office tower hosts companies offering contracts. Select a{" "}
        <strong>tower on the map</strong>, then manually assign units for each
        job. Power and resources come from the <strong>selected office</strong>.
        Each contract also spends <strong>+2 Connection</strong> on top of the
        min bid.
      </p>
      <p className="cost-line">
        Region: <strong>{REGION_LABELS[tower.region]}</strong> · Host companies
        scale with local market (crew sizing is not disclosed).
      </p>
      {lockedProjects.length > 0 && (
        <p className="cost-line">
          Locked at this tower:{" "}
          {lockedProjects
            .map((p) => `${p.name} (need ${p.intelRequired} intel firm-wide)`)
            .join(" · ")}
        </p>
      )}
      <div className="project-grid">
        {towerProjects
          .filter((project) => isProjectUnlocked(state, project))
          .map((project) => {
            const assignment = assignmentFor(project.id);
            const mergedPreview = mergedProjectBid(project);
            const affordable = canAffordAtOffice(
              state,
              officeId,
              mergedPreview,
            );
            const hasValidCrew = canAssignFromRoster(officeRoster, assignment);
            const towerSelected = state.selectedTowerId === project.towerId;
            const disabled =
              busy || !affordable || !hasValidCrew || !towerSelected;
            const bidLabel = submitContractLabel(
              state,
              officeId,
              project,
              assignment,
              busy,
            );

            return (
              <article key={project.id} className="project-card">
                <header>
                  <strong>{project.name}</strong>
                  <span>{project.client}</span>
                </header>
                <ul>
                  <li>Duration: {project.durationSec}s base</li>
                  <li>Total payout: {formatCost(project.totalPayout)}</li>
                  {project.tags && project.tags.length > 0 && (
                    <li>Tags: {project.tags.join(", ")}</li>
                  )}
                </ul>
                <MissionCrewPicker
                  officeId={officeId}
                  project={project}
                  roster={officeRoster}
                  assignment={assignment}
                  disabled={busy}
                  onChange={(next) =>
                    setCrewByProject((prev) => ({
                      ...prev,
                      [project.id]: next,
                    }))
                  }
                />
                <p className="cost-line">
                  Min bid:{" "}
                  {Object.entries(project.minBid)
                    .map(([k, v]) =>
                      k === "electricity"
                        ? `power ${formatNumber(v ?? 0)}`
                        : `${k} ${formatNumber(v ?? 0)}`,
                    )
                    .join(" · ")}
                  {" · Connection 2 (contract fee)"}
                </p>
                <button
                  type="button"
                  className="btn primary"
                  disabled={disabled}
                  onClick={() => startProject(project)}
                >
                  {bidLabel}
                </button>
              </article>
            );
          })}
      </div>
      <p className="muted project-tower-picker">
        All towers:{" "}
        {OFFICE_TOWERS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="btn linkish"
            disabled={t.id === towerId}
            aria-current={t.id === towerId ? "true" : undefined}
            onClick={() =>
              dispatch({ type: "SELECT_TOWER", towerId: t.id })
            }
          >
            {t.name}
          </button>
        ))}
      </p>
    </section>
  );
}
