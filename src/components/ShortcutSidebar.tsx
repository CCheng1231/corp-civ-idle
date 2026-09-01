import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { GameAction, GameState, MainView } from "../game/types";

const HOME_HUB_VIEWS: MainView[] = ["operations", "recruitment", "research"];

const HOME_HUB_ITEMS: { view: MainView; short: string }[] = [
  { view: "operations", short: "Build" },
  { view: "recruitment", short: "Recruit" },
  { view: "research", short: "R&D" },
];

const PRIMARY_SHORTCUTS: { view: MainView; label: string; short: string }[] = [
  { view: "world", label: "World map", short: "World" },
  { view: "overview", label: "Overview", short: "Home" },
  { view: "office", label: "Secretary", short: "Secretary" },
  { view: "logbook", label: "Notes & logbook", short: "Log" },
  { view: "settings", label: "Settings", short: "Set" },
];

const MOBILE_VISIBLE = 5;
const DRAG_START_PX = 10;

interface ShortcutSidebarProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileNav: boolean;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function isHomeHubView(view: MainView): boolean {
  return HOME_HUB_VIEWS.includes(view);
}

function MobileMoreChevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      className="shortcut-mobile-chevron"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {dir === "right" ? (
        <polyline
          points="9 6 15 12 9 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <polyline
          points="15 6 9 12 15 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function ShortcutSidebar({
  state,
  dispatch,
  collapsed,
  onToggleCollapse,
  mobileNav,
}: ShortcutSidebarProps) {
  const maxShift = Math.max(0, PRIMARY_SHORTCUTS.length - MOBILE_VISIBLE);
  const [shiftIndex, setShiftIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [homeHubOpen, setHomeHubOpen] = useState(false);
  const pointerRef = useRef<{
    id: number;
    startX: number;
    lastX: number;
    dragging: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const homeHubWrapRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  function goHome() {
    setHomeHubOpen(false);
    dispatch({ type: "SET_VIEW", view: "overview" });
  }

  function navigate(view: MainView) {
    setHomeHubOpen(false);
    dispatch({ type: "SET_VIEW", view });
  }

  function handleHomeClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (suppressClickRef.current) return;

    if (homeHubOpen) {
      goHome();
      return;
    }

    setHomeHubOpen(true);
  }

  useEffect(() => {
    if (!homeHubOpen) return;

    let removeListener: (() => void) | undefined;
    const attachId = window.setTimeout(() => {
      function handlePointerDown(event: PointerEvent) {
        const target = event.target;
        if (!(target instanceof Node)) return;
        if (homeHubWrapRef.current?.contains(target)) return;
        setHomeHubOpen(false);
      }

      document.addEventListener("pointerdown", handlePointerDown);
      removeListener = () =>
        document.removeEventListener("pointerdown", handlePointerDown);
    }, 0);

    return () => {
      window.clearTimeout(attachId);
      removeListener?.();
    };
  }, [homeHubOpen]);

  useEffect(() => {
    if (!mobileNav) return;
    const i = PRIMARY_SHORTCUTS.findIndex((item) => {
      if (item.view === "overview") {
        return (
          state.view === "overview" ||
          isHomeHubView(state.view) ||
          homeHubOpen
        );
      }
      return item.view === state.view;
    });
    if (i < 0) return;
    setShiftIndex((current) => {
      if (i < current) return i;
      if (i >= current + MOBILE_VISIBLE) return i - MOBILE_VISIBLE + 1;
      return current;
    });
  }, [mobileNav, state.view, homeHubOpen]);

  const finishDrag = (clientX: number) => {
    const pointer = pointerRef.current;
    pointerRef.current = null;
    if (!pointer) return;
    if (!pointer.dragging) {
      setDragging(false);
      setDragOffset(0);
      return;
    }
    suppressClickRef.current = true;
    const width = navRef.current?.clientWidth ?? 1;
    const slot = width / MOBILE_VISIBLE;
    const dx = clientX - pointer.startX;
    const deltaSlots = Math.round(-dx / slot);
    setShiftIndex((current) => clamp(current + deltaSlots, 0, maxShift));
    setDragOffset(0);
    setDragging(false);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!mobileNav || event.button !== 0) return;
    const target = event.target;
    if (target instanceof Node && homeHubWrapRef.current?.contains(target)) {
      return;
    }
    pointerRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      lastX: event.clientX,
      dragging: false,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    pointer.lastX = event.clientX;
    const dx = event.clientX - pointer.startX;
    if (!pointer.dragging && Math.abs(dx) < DRAG_START_PX) return;
    if (!pointer.dragging) {
      pointer.dragging = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const width = navRef.current?.clientWidth ?? 1;
    const slot = width / MOBILE_VISIBLE;
    const min = -(maxShift - shiftIndex) * slot;
    const max = shiftIndex * slot;
    const rubber = 0.35;
    let offset = dx;
    if (offset > max) offset = max + (offset - max) * rubber;
    if (offset < min) offset = min + (offset - min) * rubber;
    setDragOffset(offset);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    finishDrag(pointer.lastX);
  };

  const onLostPointerCapture = (event: ReactPointerEvent<HTMLElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    finishDrag(pointer.lastX);
  };

  const onNavClickCapture = (event: ReactMouseEvent<HTMLElement>) => {
    if (!suppressClickRef.current) return;
    const target = event.target;
    if (target instanceof Node && homeHubWrapRef.current?.contains(target)) {
      suppressClickRef.current = false;
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  };

  const shiftMore = () => {
    setShiftIndex((current) => (current >= maxShift ? 0 : maxShift));
  };

  const atEnd = shiftIndex >= maxShift;
  const slotPercent = 100 / MOBILE_VISIBLE;
  const homeActive =
    state.view === "overview" ||
    homeHubOpen ||
    isHomeHubView(state.view);

  function renderHomeHub() {
    return (
      <div
        key="overview"
        ref={homeHubWrapRef}
        className={`shortcut-home-hub-wrap${homeHubOpen ? " shortcut-home-hub-wrap-open" : ""}`}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {homeHubOpen ? (
          <div className="shortcut-home-hub-menu" role="menu" aria-label="Home tabs">
            {HOME_HUB_ITEMS.map((item) => (
              <button
                key={item.view}
                type="button"
                role="menuitem"
                className={
                  state.view === item.view
                    ? "shortcut-home-hub-item active"
                    : "shortcut-home-hub-item"
                }
                onClick={() => navigate(item.view)}
              >
                {item.short}
              </button>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          className={
            homeActive
              ? "shortcut-link active shortcut-home-hub-trigger"
              : "shortcut-link shortcut-home-hub-trigger"
          }
          title="Home — opens Build, Recruit, and R&D"
          aria-expanded={homeHubOpen}
          aria-haspopup="menu"
          onClick={handleHomeClick}
        >
          <span className="shortcut-link-short">Home</span>
          {!mobileNav && !collapsed ? (
            <span className="shortcut-link-label">Overview</span>
          ) : null}
        </button>
      </div>
    );
  }

  function renderShortcut(item: (typeof PRIMARY_SHORTCUTS)[number]) {
    if (item.view === "overview") return renderHomeHub();

    return (
      <button
        key={item.view}
        type="button"
        className={
          state.view === item.view ? "shortcut-link active" : "shortcut-link"
        }
        title={item.label}
        onClick={() => navigate(item.view)}
      >
        <span className="shortcut-link-short">{item.short}</span>
        {!mobileNav && !collapsed ? (
          <span className="shortcut-link-label">{item.label}</span>
        ) : null}
      </button>
    );
  }

  return (
    <aside
      className={`shortcut-sidebar${collapsed && !mobileNav ? " shortcut-sidebar-collapsed" : ""}${mobileNav ? " shortcut-sidebar-mobile" : ""}${homeHubOpen ? " shortcut-sidebar-home-hub-open" : ""}`}
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
      <nav
        ref={navRef}
        className="shortcut-nav"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onLostPointerCapture}
        onClickCapture={onNavClickCapture}
      >
        <div
          className={`shortcut-nav-track${mobileNav ? " shortcut-nav-track-mobile" : ""}`}
          style={
            mobileNav
              ? {
                  transform: `translateX(calc(${-shiftIndex * slotPercent}% + ${dragOffset}px))`,
                  transition: dragging ? "none" : "transform 0.22s ease",
                }
              : undefined
          }
        >
          {PRIMARY_SHORTCUTS.map(renderShortcut)}
        </div>
      </nav>
      {mobileNav && maxShift > 0 ? (
        <button
          type="button"
          className="shortcut-mobile-more"
          aria-label={atEnd ? "Show previous shortcuts" : "Show more shortcuts"}
          title={atEnd ? "Previous" : "More"}
          onClick={shiftMore}
        >
          <MobileMoreChevron dir={atEnd ? "left" : "right"} />
        </button>
      ) : null}
    </aside>
  );
}

export const MAIN_VIEW_TITLES: Record<MainView, string> = {
  overview: "HQ overview",
  world: "World map",
  operations: "Build — structures",
  recruitment: "Recruit contractors",
  research: "R&D — firm-wide tech",
  office: "Secretary — jobs & reports",
  logbook: "Notes & logbook",
  settings: "Settings",
};
