import { type Dispatch } from "react";
import type { GameAction, GameState, MainView } from "../game/types";
const SHORTCUTS: { view: MainView; label: string; short: string }[] = [
  { view: "world", label: "World map", short: "World" },
  { view: "overview", label: "Overview", short: "Home" },
  { view: "operations", label: "Office sites", short: "Office" },
  { view: "recruitment", label: "Recruitment", short: "Hire" },
  { view: "research", label: "Research", short: "R&D" },
  { view: "office", label: "Secretary", short: "Sec" },
  { view: "logbook", label: "Notes & logbook", short: "Log" },
  { view: "settings", label: "Settings", short: "Set" },
];

interface ShortcutSidebarProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileNav: boolean;
}

export function ShortcutSidebar({
  state,
  dispatch,
  collapsed,
  onToggleCollapse,
  mobileNav,
}: ShortcutSidebarProps) {

  return (
    <aside
      className={`shortcut-sidebar${collapsed && !mobileNav ? " shortcut-sidebar-collapsed" : ""}${mobileNav ? " shortcut-sidebar-mobile" : ""}`}
      aria-label="Shortcuts"
    >
      {!mobileNav && (
        <button
          type="button"
          className="shortcut-collapse-btn"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand menu" : "Collapse menu"}
        >
          {collapsed ? "»" : "«"}
        </button>
      )}
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
            {!mobileNav && !collapsed ? (
              <span className="shortcut-link-label">{item.label}</span>
            ) : null}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export const MAIN_VIEW_TITLES: Record<MainView, string> = {
  overview: "HQ overview",
  world: "World map",
  operations: "Office sites & upgrades",
  recruitment: "Recruitment",
  research: "Research",
  office: "Office / Secretary",
  logbook: "Notes & logbook",
  settings: "Settings",
};
