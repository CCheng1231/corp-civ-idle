import { useState, type Dispatch } from "react";
import {
  OFFICE_LABELS,
  canAffordAtOffice,
  formatNumber,
  isProjectUnlocked,
  powerAvailable,
  rosterAt,
  splitResourceCost,
  supportStaffForMission,
} from "../game/constants";
import {
  OFFICE_TOWERS,
  REGION_LABELS,
  projectsForTower,
  towerById,
} from "../game/mapWorld";
import type { GameAction, GameState, ProjectDefinition } from "../game/types";

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
  farmingAssigned: number,
  busy: boolean,
): string {
  if (busy) return "Crew busy (job in progress)";
  if (!state.selectedTowerId || state.selectedTowerId !== project.towerId) {
    return "Select this tower on the map";
  }

  const roster = rosterAt(state, officeId);
  if (farmingAssigned < 1) return "Assign at least 1 farming crew";
  if (roster.farming < farmingAssigned) {
    return `Need ${farmingAssigned} farming at ${OFFICE_LABELS[officeId]} (${roster.farming} here)`;
  }

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
  const [crewByProject, setCrewByProject] = useState<Record<string, number>>(
    {},
  );

  function crewFor(projectId: string): number {
    return crewByProject[projectId] ?? 1;
  }

  function startProject(project: ProjectDefinition) {
    const farmingAssigned = crewFor(project.id);
    dispatch({
      type: "START_PROJECT",
      projectId: project.id,
      bid: { connection: 2 },
      farmingAssigned,
    });
  }

  const towerProjects = projectsForTower(towerId);
  const lockedProjects = towerProjects.filter((p) => !isProjectUnlocked(state, p));

  return (
    <section className="project-panel">
      <h2>Company projects — {tower.name}</h2>
      <p className="muted">
        Each office tower hosts companies offering contracts. Select a{" "}
        <strong>tower on the map</strong> to see its project board. Jobs use
        farming staff and power from the <strong>selected office</strong> (HQ
        until you open a branch). Listed payout is the full contract value —
        crew sizing affects what you actually earn. Each contract also spends{" "}
        <strong>+2 Connection</strong> on top of the min bid.
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
            const farmingAssigned = crewFor(project.id);
            const mergedPreview = mergedProjectBid(project);
            const affordable = canAffordAtOffice(
              state,
              officeId,
              mergedPreview,
            );
            const hasCrew = officeRoster.farming >= farmingAssigned;
            const towerSelected = state.selectedTowerId === project.towerId;
            const disabled =
              busy || !affordable || !hasCrew || !towerSelected;
            const bidLabel = submitContractLabel(
              state,
              officeId,
              project,
              farmingAssigned,
              busy,
            );
            const support = supportStaffForMission(
              state,
              officeId,
              farmingAssigned,
            );
            return (
              <article key={project.id} className="project-card">
                <header>
                  <strong>{project.name}</strong>
                  <span>{project.client}</span>
                </header>
                <ul>
                  <li>Duration: {project.durationSec}s</li>
                  <li>Total payout: {formatCost(project.totalPayout)}</li>
                  <li>
                    Field crew:{" "}
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, officeRoster.farming)}
                      value={farmingAssigned}
                      disabled={busy}
                      onChange={(e) => {
                        const n = Math.max(
                          1,
                          Math.min(
                            officeRoster.farming || 1,
                            Number(e.target.value) || 1,
                          ),
                        );
                        setCrewByProject((prev) => ({
                          ...prev,
                          [project.id]: n,
                        }));
                      }}
                    />{" "}
                    at {OFFICE_LABELS[officeId]}
                    {support > 0
                      ? ` · ${support} support (faster / bonus pay)`
                      : ""}
                  </li>
                </ul>
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
        Other towers:{" "}
        {OFFICE_TOWERS.filter((t) => t.id !== towerId).map((t) => (
          <button
            key={t.id}
            type="button"
            className="btn linkish"
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
