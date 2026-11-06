import {
  PROGRESSION_CATALOG_INFO,
  type ProgressionCatalogInfoKind,
} from "./progressionCatalogInfoContent";

interface ProgressionCatalogInfoDialogProps {
  kind: ProgressionCatalogInfoKind;
  onClose: () => void;
}

export function ProgressionCatalogInfoDialog({
  kind,
  onClose,
}: ProgressionCatalogInfoDialogProps) {
  const { title, intro, sections } = PROGRESSION_CATALOG_INFO[kind];

  return (
    <div
      className="modal-backdrop progression-catalog-info-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal progression-catalog-info-dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="progression-catalog-info-title"
      >
        <header className="modal-header">
          <h2 id="progression-catalog-info-title">{title}</h2>
        </header>
        <div className="progression-catalog-info-body">
          <p className="progression-catalog-info-intro">{intro}</p>
          <ul className="progression-catalog-info-sections">
            {sections.map((section) => (
              <li key={section.heading} className="progression-catalog-info-section">
                <h3>{section.heading}</h3>
                <p>{section.body}</p>
              </li>
            ))}
          </ul>
        </div>
        <footer className="progression-catalog-info-actions">
          <button type="button" className="btn primary" onClick={onClose}>
            Got it
          </button>
        </footer>
      </div>
    </div>
  );
}
