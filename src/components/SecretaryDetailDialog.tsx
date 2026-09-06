import type { SecretaryDefinition } from "../game/secretaryData";
import { secretaryRosterPortraitSrc } from "../game/secretaryAssets";
import type { SecretaryId } from "../game/types";
import { DraggableTabPortraitFrame } from "./DraggableTabPortraitFrame";

interface SecretaryDetailDialogProps {
  secretary: SecretaryDefinition;
  chiefOfStaffId: SecretaryId;
  onAssignChief: (id: SecretaryId) => void;
  onClose: () => void;
}

export function SecretaryDetailDialog({
  secretary,
  chiefOfStaffId,
  onAssignChief,
  onClose,
}: SecretaryDetailDialogProps) {
  const portrait = secretaryRosterPortraitSrc(secretary.id);
  const isChief = secretary.id === chiefOfStaffId;

  return (
    <div
      className="modal-backdrop secretary-detail-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal secretary-detail-dialog"
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
        <div className="secretary-detail-layout">
          <div className="secretary-detail-portrait-pane">
            <DraggableTabPortraitFrame
              src={portrait}
              panStorageKey={`corp-civ-idle-secretary-detail-${secretary.id}`}
              focalYPercent={6}
              className="secretary-detail-portrait-frame"
            />
          </div>
          <div className="secretary-detail-copy-pane">
            <header className="secretary-detail-header">
              <h2 id="secretary-detail-title">{secretary.name}</h2>
              <p className="muted secretary-detail-role">
                {isChief ? "Chief of Staff" : "Chief of Staff candidate"}
              </p>
            </header>
            <div className="secretary-detail-flavour">
              {secretary.flavour.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <dl className="secretary-detail-stats">
              <div>
                <dt>As Chief of Staff</dt>
                <dd>{secretary.chiefOfStaffBonus}</dd>
              </div>
              <div>
                <dt>As team lead</dt>
                <dd>{secretary.teamLeadBonus}</dd>
              </div>
            </dl>
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
          </div>
        </div>
      </div>
    </div>
  );
}
