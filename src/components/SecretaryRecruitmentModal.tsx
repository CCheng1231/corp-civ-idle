import { useEffect, type Dispatch } from "react";
import { SECRETARIES } from "../game/secretaryData";
import { GACHA_SECRETARY_IDS } from "../game/secretarySkillData";
import { secretaryRosterPortraitSrc } from "../game/secretaryAssets";
import { lockedGachaPool } from "../game/secretaryProgress";
import { recruitmentLoreIntro } from "../game/secretaryRecruitment";
import type { GameAction, GameState, SecretaryId } from "../game/types";

interface SecretaryRecruitmentModalProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function SecretaryRecruitmentModal({
  state,
  dispatch,
}: SecretaryRecruitmentModalProps) {
  const offer = state.secretaryRecruitment.pendingOffer;

  useEffect(() => {
    if (!offer || offer.phase !== "animating") return undefined;
    const timer = window.setTimeout(() => {
      dispatch({ type: "SECRETARY_RECRUIT_ANIMATION_DONE" });
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [dispatch, offer]);

  if (!offer) return null;

  const pool = lockedGachaPool(state);
  const candidateIds = GACHA_SECRETARY_IDS.filter((id) => pool.includes(id));

  const revealedId =
    offer.phase === "revealed" || offer.phase === "animating"
      ? offer.revealedId
      : null;

  return (
    <div className="modal-backdrop secretary-recruit-backdrop" role="presentation">
      <div
        className="modal secretary-recruit-modal"
        role="dialog"
        aria-labelledby="secretary-recruit-title"
      >
        <header className="modal-header">
          <h2 id="secretary-recruit-title">Executive recruitment</h2>
        </header>
        <p className="secretary-recruit-lore">
          {recruitmentLoreIntro(state, offer.milestoneId)}
        </p>

        {offer.phase === "offer" ? (
          <div className="secretary-recruit-candidates">
            <p className="muted">Candidates still on the shortlist:</p>
            <ul className="secretary-recruit-candidate-grid">
              {candidateIds.map((id) => {
                const def = SECRETARIES.find((s) => s.id === id);
                if (!def) return null;
                return (
                  <li key={id} className="secretary-recruit-candidate-card">
                    <img
                      className="secretary-recruit-candidate-portrait"
                      src={secretaryRosterPortraitSrc(id)}
                      alt=""
                    />
                    <span>{def.name}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div
            className={`secretary-recruit-reveal${offer.phase === "animating" ? " is-animating" : ""}`}
          >
            <div className="secretary-recruit-hr-folder" aria-hidden>
              <span className="secretary-recruit-hr-tab">HR</span>
            </div>
            {revealedId ? (
              <img
                className="secretary-recruit-reveal-portrait"
                src={secretaryRosterPortraitSrc(revealedId)}
                alt=""
              />
            ) : null}
          </div>
        )}

        <footer className="confirm-dialog-actions">
          {offer.phase === "offer" ? (
            <>
              <button
                type="button"
                className="btn"
                onClick={() => dispatch({ type: "SECRETARY_RECRUIT_DISMISS" })}
              >
                Later
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={pool.length === 0}
                onClick={() => dispatch({ type: "SECRETARY_RECRUIT_COMMIT" })}
              >
                Recruit
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn primary"
              onClick={() => dispatch({ type: "SECRETARY_RECRUIT_DISMISS" })}
            >
              Welcome aboard
            </button>
          )}
        </footer>
        {offer.phase === "revealed" && revealedId ? (
          <p className="secretary-recruit-welcome">
            {candidateLabel(revealedId)} joins your roster.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function candidateLabel(id: SecretaryId): string {
  return SECRETARIES.find((s) => s.id === id)?.name ?? "New secretary";
}
