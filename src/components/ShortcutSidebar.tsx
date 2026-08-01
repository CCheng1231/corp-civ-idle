import { useEffect, useState, type Dispatch } from "react";
import type { GameAction, GameState, MainView } from "../game/types";

const MOBILE_NAV_MQ = "(max-width: 768px)";

function useMobileNavLayout(): boolean {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(MOBILE_NAV_MQ).matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_NAV_MQ);
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return mobile;
}

const SHORTCUTS: { view: MainView; label: string; short: string }[] = [
  { view: "world", label: "World map", short: "Map" },
  { view: "overview", label: "Overview", short: "HQ" },
  { view: "operations", label: "Office sites", short: "Sites" },
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
}

export function ShortcutSidebar({
  state,
  dispatch,
  collapsed,
  onToggleCollapse,
}: ShortcutSidebarProps) {
  const mobileNav = useMobileNavLayout();

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
            {(!collapsed || mobileNav) && (
              <span className="shortcut-link-label">{item.label}</span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export const MAIN_VIEW_TITLES: Record<MainView, string> = {
  overview: "HQ overview",
  world: "World map & open bids",
  operations: "Office sites & upgrades",
  research: "Research",
  office: "Office / Secretary",
  logbook: "Notes & logbook",
  settings: "Settings",
};
