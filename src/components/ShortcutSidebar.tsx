import type { Dispatch } from "react";
import type { GameAction, GameState, MainView } from "../game/types";

const SHORTCUTS: { view: MainView; label: string; short: string }[] = [
  { view: "operations", label: "Office sites", short: "Sites" },
  { view: "world", label: "World map", short: "Map" },
  { view: "research", label: "Research", short: "R&D" },
  { view: "office", label: "Secretary", short: "Sec" },
  { view: "logbook", label: "Logbook", short: "Log" },
  { view: "notes", label: "Notes", short: "Note" },
  { view: "settings", label: "Settings", short: "Set" },
];

interface ShortcutSidebarProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function ShortcutSidebar({
  state,
  dispatch,
  collapsed,
  onToggleCollapse,
}: ShortcutSidebarProps) {
  return (
    <aside
      className={`shortcut-sidebar${collapsed ? " shortcut-sidebar-collapsed" : ""}`}
      aria-label="Shortcuts"
    >
      <button
        type="button"
        className="shortcut-collapse-btn"
        onClick={onToggleCollapse}
        aria-expanded={!collapsed}
        title={collapsed ? "Expand menu" : "Collapse menu"}
      >
        {collapsed ? "»" : "«"}
      </button>
      <nav className="shortcut-nav">
        {SHORTCUTS.map((item) => (
          <button
            key={item.view}
            type="button"
            className={
              state.view === item.view
                ? "shortcut-link active"
                : "shortcut-link"
            }
            title={item.label}
            onClick={() => dispatch({ type: "SET_VIEW", view: item.view })}
          >
            <span className="shortcut-link-short">{item.short}</span>
            {!collapsed && (
              <span className="shortcut-link-label">{item.label}</span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export const MAIN_VIEW_TITLES: Record<MainView, string> = {
  world: "World map & open bids",
  operations: "Office sites & upgrades",
  research: "Research",
  office: "Office / Secretary",
  logbook: "Logbook",
  notes: "Notes",
  settings: "Settings",
};
