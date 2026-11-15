import { type Dispatch } from "react";
import { useDragScroll } from "../hooks/useDragScroll";
import { secretaryById } from "../game/secretaryData";
import { secretaryRosterPortraitSrc } from "../game/secretaryAssets";
import {
  SECRETARY_SKIN_CATALOG,
  secretarySkinCatalogEntry,
  secretarySkinPortraitSrc,
  type SecretaryUnlockableSkinId,
} from "../game/secretarySkinData";
import type { GameAction, GameState } from "../game/types";

interface SecretarySkinUnlockModalProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function SecretarySkinUnlockModal({
  state,
  dispatch,
}: SecretarySkinUnlockModalProps) {
  const offer = state.secretarySkins?.pendingOffer;
  const { dragging, shouldSuppressClick, ...dragScroll } = useDragScroll();

  if (!offer) return null;

  const def = secretaryById(offer.secretaryId);
  const treeLabel =
    offer.tree === "chief" ? "Chief of Staff" : "Team lead";

  function selectSkin(skinId: SecretaryUnlockableSkinId) {
    if (shouldSuppressClick()) return;
    const entry = secretarySkinCatalogEntry(skinId);
    if (!entry.unlockable) return;
    dispatch({ type: "SECRETARY_SKIN_UNLOCK", skinId });
  }

  return (
    <div className="modal-backdrop secretary-skin-backdrop" role="presentation">
      <div
        className="modal secretary-skin-modal"
        role="dialog"
        aria-labelledby="secretary-skin-title"
      >
        <header className="modal-header">
          <h2 id="secretary-skin-title">Wardrobe unlock — {def.name}</h2>
        </header>
        <p className="secretary-skin-lore">
          You mastered the {treeLabel} skill tree. Choose a wardrobe variant to
          unlock for {def.name}.
        </p>
        <div
          className={[
            "secretary-skin-catalog-scroll",
            dragging ? "secretary-skin-catalog-scroll--dragging" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          role="list"
          aria-label={`Skins for ${def.name}`}
          {...dragScroll}
        >
          {SECRETARY_SKIN_CATALOG.map((entry) => {
            const previewSrc =
              entry.id === "nurse"
                ? secretarySkinPortraitSrc(entry.id, offer.secretaryId) ??
                  secretaryRosterPortraitSrc(offer.secretaryId, state)
                : null;
            return (
              <article
                key={entry.id}
                className={`secretary-skin-catalog-card${entry.unlockable ? " is-selectable" : " is-locked"}`}
                role="listitem"
                onClick={() => entry.unlockable && selectSkin(entry.id)}
                onKeyDown={(event) => {
                  if (!entry.unlockable) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectSkin(entry.id);
                  }
                }}
                tabIndex={entry.unlockable ? 0 : undefined}
              >
                <div className="secretary-skin-catalog-thumb">
                  {previewSrc ? (
                    <img src={previewSrc} alt="" draggable={false} />
                  ) : (
                    <span className="secretary-skin-catalog-placeholder muted">
                      TBD
                    </span>
                  )}
                </div>
                <h3 className="secretary-skin-catalog-label">{entry.label}</h3>
                <p className="muted secretary-skin-catalog-desc">
                  {entry.description}
                </p>
                {entry.passiveBonusLabel ? (
                  <p className="secretary-skin-catalog-perk">
                    {entry.passiveBonusLabel}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="btn btn-sm primary"
                  disabled={!entry.unlockable}
                  onClick={(event) => {
                    event.stopPropagation();
                    selectSkin(entry.id);
                  }}
                >
                  {entry.unlockable ? "Unlock" : "Locked"}
                </button>
              </article>
            );
          })}
        </div>
        <footer className="confirm-dialog-actions">
          <button
            type="button"
            className="btn"
            onClick={() => dispatch({ type: "SECRETARY_SKIN_DEFER" })}
          >
            Later
          </button>
        </footer>
      </div>
    </div>
  );
}