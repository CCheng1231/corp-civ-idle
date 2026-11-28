import { useEffect, useLayoutEffect, type Dispatch } from "react";
import { createPortal } from "react-dom";
import { appOverlayPortalRoot } from "./appOverlayPortalRoot";
import type { SecretaryDefinition } from "../game/secretaryData";
import {
  createInitialSecretaryProgress,
  ensureSecretaryProgressShape,
} from "../game/secretaryProgress";
import {
  effectiveChiefBonusLabel,
  effectiveTeamLeadBonusLabel,
} from "../game/secretaryEffects";
import { officeSiteLabel } from "../game/constants";
import { secretaryPostedOffice } from "../game/secretaryPosting";
import { expRequiredForNextLevel, SECRETARY_MAX_LEVEL } from "../game/secretarySkillData";
import { SecretarySkillWorkbook } from "./SecretarySkillWorkbook";
import {
  secretaryRosterPortraitSrc,
  secretaryTabPortraitSrc,
} from "../game/secretaryAssets";
import {
  SECRETARY_SKIN_CATALOG,
  secretarySkinPortraitSrc,
  type SecretaryUnlockableSkinId,
} from "../game/secretarySkinData";
import { equippedSecretarySkinId } from "../game/secretarySkins";
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
  const progress = ensureSecretaryProgressShape(
    state.secretaryProgress[secretary.id] ?? createInitialSecretaryProgress(),
  );
  const nextLevelExp =
    progress.level >= SECRETARY_MAX_LEVEL
      ? 0
      : expRequiredForNextLevel(progress.level);
  const expPct =
    nextLevelExp > 0
      ? Math.min(100, Math.round((progress.exp / nextLevelExp) * 100))
      : 100;
  const unlockedSkins = state.secretarySkins?.unlocked[secretary.id] ?? [];
  const equippedSkin = equippedSecretarySkinId(state, secretary.id);
  const postedLabel = officeSiteLabel(
    state,
    secretaryPostedOffice(state, secretary.id),
  );
  const roleLine = isChief ? "Chief of Staff" : "Executive secretary";
  const sheetBg = secretaryTabPortraitSrc(secretary.id, state);
  const rosterPortrait = secretaryRosterPortraitSrc(secretary.id, state);

  useLayoutEffect(() => {
    syncAppTopChromeHeight();
    window.addEventListener("resize", syncAppTopChromeHeight);
    return () => window.removeEventListener("resize", syncAppTopChromeHeight);
  }, []);

  useEffect(() => {
    const portalRoot = appOverlayPortalRoot();
    const scrollLockEl =
      portalRoot.classList.contains("device-preview-webview")
        ? ((portalRoot.querySelector(".app-shell") as HTMLElement | null) ??
          portalRoot)
        : document.body;
    const previous = scrollLockEl.style.overflow;
    scrollLockEl.style.overflow = "hidden";
    return () => {
      scrollLockEl.style.overflow = previous;
    };
  }, []);

  const sheet = (
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
        <div
          className="secretary-skill-sheet-bg"
          style={{ backgroundImage: `url('${sheetBg}')` }}
          aria-hidden="true"
        />
        <button
          type="button"
          className="secretary-detail-close"
          aria-label="Close secretary profile"
          onClick={onClose}
        >
          ×
        </button>
        <div className="secretary-skill-sheet-scroll">
          <div className="secretary-skill-who">
            <img src={rosterPortrait} alt="" draggable={false} />
            <div>
              <h2 id="secretary-detail-title">{secretary.name}</h2>
              <p className="secretary-skill-role">{roleLine}</p>
              <p className="secretary-skill-role">Posted office · {postedLabel}</p>
              <p className="secretary-skill-level">
                Level {progress.level}
                {progress.level >= SECRETARY_MAX_LEVEL
                  ? " · MAX"
                  : ` · ${progress.exp} / ${nextLevelExp} EXP`}
              </p>
              <div
                className="secretary-skill-exp"
                role="progressbar"
                aria-valuenow={expPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${expPct}%` }} />
              </div>
              <p className="secretary-skill-points-line">
                Unspent skill points:{" "}
                <span className="points-value">{progress.unspentSkillPoints}</span>
              </p>
            </div>
          </div>

          <hr className="secretary-skill-divider" aria-hidden="true" />

          <div className="secretary-skill-chief-assign-row">
            <button
              type="button"
              className="btn primary secretary-skill-chief-btn"
              disabled={isChief}
              onClick={() => onAssignChief(secretary.id)}
            >
              {isChief ? "Current Chief of Staff" : "Set as Chief of Staff"}
            </button>
          </div>

          <dl className="secretary-skill-identity">
            <div>
              <dt>As Chief of Staff</dt>
              <dd>{effectiveChiefBonusLabel(state, secretary.id)}</dd>
            </div>
            <div>
              <dt>As team lead</dt>
              <dd>{effectiveTeamLeadBonusLabel(state, secretary.id)}</dd>
            </div>
          </dl>

          {unlockedSkins.length > 0 ? (
            <section className="secretary-detail-skin-panel" aria-label="Wardrobe">
              <h3>Wardrobe</h3>
              <div className="secretary-detail-skin-options">
                <button
                  type="button"
                  className={`secretary-detail-skin-option${equippedSkin == null ? " is-active" : ""}`}
                  onClick={() =>
                    dispatch({
                      type: "SECRETARY_SKIN_EQUIP",
                      secretaryId: secretary.id,
                      skinId: null,
                    })
                  }
                >
                  <img
                    src={secretaryRosterPortraitSrc(secretary.id)}
                    alt=""
                    draggable={false}
                  />
                  <span>Default</span>
                </button>
                {unlockedSkins.map((skinId) => {
                  const meta = SECRETARY_SKIN_CATALOG.find((e) => e.id === skinId);
                  const src =
                    secretarySkinPortraitSrc(skinId, secretary.id) ??
                    secretaryRosterPortraitSrc(secretary.id, state);
                  return (
                    <button
                      key={skinId}
                      type="button"
                      className={`secretary-detail-skin-option${equippedSkin === skinId ? " is-active" : ""}`}
                      onClick={() =>
                        dispatch({
                          type: "SECRETARY_SKIN_EQUIP",
                          secretaryId: secretary.id,
                          skinId: skinId as SecretaryUnlockableSkinId,
                        })
                      }
                    >
                      <img src={src} alt="" draggable={false} />
                      <span>{meta?.label ?? skinId}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <p className="secretary-skill-tap-hint">
            Tap a skill to spend 1 point and add 1 rank. Ranks stack — see each
            card for per-rank and total.
          </p>

          <SecretarySkillWorkbook
            state={state}
            dispatch={dispatch}
            secretaryId={secretary.id}
            progress={progress}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, appOverlayPortalRoot());
}