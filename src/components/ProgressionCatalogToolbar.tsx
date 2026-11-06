interface ProgressionCatalogToolbarProps {
  onCollapseAll: () => void;
  onInfo?: () => void;
  filterToggle?: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  };
}

export function ProgressionCatalogToolbar({
  onCollapseAll,
  onInfo,
  filterToggle,
}: ProgressionCatalogToolbarProps) {
  return (
    <div className="office-structures-catalog-toolbar">
      {onInfo ? (
        <button
          type="button"
          className="office-collapse-all office-catalog-toolbar-chip"
          onClick={onInfo}
          aria-haspopup="dialog"
        >
          Info
        </button>
      ) : null}
      {filterToggle ? (
        <button
          type="button"
          className={[
            "office-collapse-all",
            "office-catalog-toolbar-chip",
            filterToggle.checked ? "office-catalog-toolbar-chip--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-pressed={filterToggle.checked}
          onClick={() => filterToggle.onChange(!filterToggle.checked)}
        >
          {filterToggle.label}
        </button>
      ) : null}
      <button
        type="button"
        className="office-collapse-all office-catalog-toolbar-chip"
        onClick={onCollapseAll}
      >
        Collapse all
      </button>
    </div>
  );
}
