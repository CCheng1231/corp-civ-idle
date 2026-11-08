import { useLayoutEffect, type Dispatch } from "react";
import type { SecretaryDefinition } from "../game/secretaryData";
import { createInitialSecretaryProgress } from "../game/secretaryProgress";
import {
  effectiveChiefBonusLabel,
  effectiveTeamLeadBonusLabel,
} from "../game/secretaryEffects";
import {
  CHIEF_SKILL_DEFS,
  CHIEF_SKILL_NODES,
  expRequiredForNextLevel,
  SECRETARY_MAX_LEVEL,
  TEAM_LEAD_SKILL_DEFS,
  TEAM_LEAD_SKILL_NODES,
} from "../game/secretarySkillData";
import type { GameAction, GameState, SecretaryId } from "../game/types";

interface SecretaryDetailDialogProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  secretary: SecretaryDefinition;
  chiefOfStaffId: SecretaryId;
  onAssignChief: (id: SecretaryId) => void;
  onClose: () => void;
}

function syncAppTopChromeHeight(): void {
  const chrome = document.querySelector(".app-top-chrome");
  const height = chrome?.getBoundingClientRect().height ?? 0;
  document.documentElement.style.setProperty(
    "--app-top-chrome-height",
    `${Math.round(height)}px`,
  );
}

export function SecretaryDetailDialog({
  state,
  dispatch,
  secretary,
  chiefOfStaffId,
  onAssignChief,
  onClose,
}: SecretaryDetailDialogProps) {
  const isChief = secretary.id === chiefOfStaffId;
  const progress =
    state.secretaryProgress[secretary.id] ?? createInitialSecretaryProgress();
  const nextLevelExp =
    progress.level >= SECRETARY_MAX_LEVEL
      ? 0
      : expRequiredForNextLevel(progress.level);
  const expPct =
    nextLevelExp > 0
      ? Math.min(100, Math.round((progress.exp / nextLevelExp) * 100))
      : 100;

  useLayoutEffect(() => {
    syncAppTopChromeHeight();
    window.addEventListener("resize", syncAppTopChromeHeight);
    return () => window.removeEventListener("resize", syncAppTopChromeHeight);
  }, []);

  return (
    <div
      className="secretary-detail-backdrop secretary-skill-screen"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="secretary-detail-dialog secretary-skill-sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="secretary-detail-title"
      >
        <button
          type="button"
          className="secretary-detail-close"
          aria-label="Close secretary profile"
          onClick={onClose}
        >
          ×
        </button>
        <div className="secretary-skill-sheet-scroll">
          <header className="secretary-detail-header">
            <h2 id="secretary-detail-title">{secretary.name}</h2>
            <p className="muted secretary-detail-role">
              {isChief ? "Chief of Staff" : "Chief of Staff candidate"}
            </p>
            <p className="secretary-detail-level">
              Level {progress.level}
              {progress.level < SECRETARY_MAX_LEVEL
                ? ` · ${progress.exp} / ${nextLevelExp} EXP`
                : " · MAX"}
            </p>
            <div
              className="secretary-detail-exp-bar"
              role="progressbar"
              aria-valuenow={expPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${expPct}%` }} />
            </div>
            <p className="muted secretary-detail-skill-points">
              Unspent skill points: {progress.unspentSkillPoints}
            </p>
          </header>
          <div className="secretary-detail-summary">
            <div className="secretary-detail-flavour">
              {secretary.flavour.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <dl className="secretary-detail-stats">
              <div>
                <dt>As Chief of Staff</dt>
                <dd>{effectiveChiefBonusLabel(state, secretary.id)}</dd>
              </div>
              <div>
                <dt>As team lead</dt>
                <dd>{effectiveTeamLeadBonusLabel(state, secretary.id)}</dd>
              </div>
            </dl>
          </div>
          <div className="secretary-detail-skill-panel">
            <section className="secretary-skill-tree">
              <h3>Chief of Staff tree</h3>
              <ul>
                {CHIEF_SKILL_NODES.map((nodeId) => {
                  const def = CHIEF_SKILL_DEFS[nodeId];
                  const rank = progress.chiefSkillRanks[nodeId] ?? 0;
                  return (
                    <li key={nodeId}>
                      <span>
                        {def.label} ({rank}/{def.maxRank})
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={
                          progress.unspentSkillPoints <= 0 ||
                          rank >= def.maxRank
                        }
                        onClick={() =>
                          dispatch({
                            type: "SECRETARY_SPEND_SKILL_POINT",
                            secretaryId: secretary.id,
                            tree: "chief",
                            nodeId,
                          })
                        }
                      >
                        Upgrade
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
            <section className="secretary-skill-tree">
              <h3>Team lead tree</h3>
              <ul>
                {TEAM_LEAD_SKILL_NODES.map((nodeId) => {
                  const def = TEAM_LEAD_SKILL_DEFS[nodeId];
                  const rank = progress.teamLeadSkillRanks[nodeId] ?? 0;
                  return (
                    <li key={nodeId}>
                      <span>
                        {def.label} ({rank}/{def.maxRank})
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={
                          progress.unspentSkillPoints <= 0 ||
                          rank >= def.maxRank
                        }
                        onClick={() =>
                          dispatch({
                            type: "SECRETARY_SPEND_SKILL_POINT",
                            secretaryId: secretary.id,
                            tree: "teamLead",
                            nodeId,
                          })
                        }
                      >
                        Upgrade
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </div>
        <footer className="secretary-skill-sheet-footer">
          <div className="secretary-detail-actions">
            <button
              type="button"
              className="btn primary secretary-detail-assign-btn"
              disabled={isChief}
              onClick={() => {
                onAssignChief(secretary.id);
                onClose();
              }}
            >
              {isChief ? "Current Chief of Staff" : "Assign as Chief of Staff"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
