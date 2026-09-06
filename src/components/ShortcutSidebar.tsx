import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { GameAction, GameState, MainView } from "../game/types";

const HOME_HUB_VIEWS: MainView[] = ["operations", "recruitment", "research"];

const SECRETARY_HUB_VIEWS: MainView[] = ["secretary", "office"];

const PRIMARY_SHORTCUTS: { view: MainView; label: string; short: string }[] = [
  { view: "world", label: "World map", short: "World" },
  { view: "overview", label: "Overview", short: "Home" },
  { view: "secretary", label: "Secretary", short: "Secretary" },
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

function isSecretaryHubView(view: MainView): boolean {
  return SECRETARY_HUB_VIEWS.includes(view);
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
  const visibleSlots =
    PRIMARY_SHORTCUTS.length <= MOBILE_VISIBLE
      ? PRIMARY_SHORTCUTS.length
      : MOBILE_VISIBLE;
  const slotPercent = 100 / visibleSlots;
  const [shiftIndex, setShiftIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const pointerRef = useRef<{
    id: number;
    startX: number;
    lastX: number;
    dragging: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const navRef = useRef<HTMLElement>(null);

  function navigate(view: MainView) {
    dispatch({ type: "SET_VIEW", view });
  }

  function handleHomeClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (suppressClickRef.current) return;

    if (isHomeHubView(state.view)) {
      dispatch({ type: "SET_VIEW", view: "overview" });
      return;
    }

    if (state.view === "overview") {
      if (state.homePanel !== "landing") {
        dispatch({ type: "SET_HOME_PANEL", panel: "landing" });
      }
      return;
    }

    dispatch({ type: "SET_VIEW", view: "overview" });
  }

  function handleSecretaryClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (suppressClickRef.current) return;

    if (state.view === "secretary") {
      if (state.secretaryPanel !== "landing") {
        dispatch({ type: "SET_SECRETARY_PANEL", panel: "landing" });
      }
      return;
    }

    dispatch({ type: "SET_VIEW", view: "secretary" });
  }

  useEffect(() => {
    if (!mobileNav) return;
    const i = PRIMARY_SHORTCUTS.findIndex((item) => {
      if (item.view === "overview") {
        return state.view === "overview" || isHomeHubView(state.view);
      }
      if (item.view === "secretary") {
        return state.view === "secretary" || state.view === "office";
      }
      return item.view === state.view;
    });
    if (i < 0) return;
    setShiftIndex((current) => {
      if (i < current) return i;
      if (i >= current + MOBILE_VISIBLE) return i - MOBILE_VISIBLE + 1;
      return current;
    });
  }, [mobileNav, state.view]);

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
    const slot = width / visibleSlots;
    const dx = clientX - pointer.startX;
    const deltaSlots = Math.round(-dx / slot);
    setShiftIndex((current) => clamp(current + deltaSlots, 0, maxShift));
    setDragOffset(0);
    setDragging(false);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!mobileNav || event.button !== 0) return;
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
    const slot = width / visibleSlots;
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
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  };

  const shiftMore = () => {
    setShiftIndex((current) => (current >= maxShift ? 0 : maxShift));
  };

  const atEnd = shiftIndex >= maxShift;
  const homeActive =
    state.view === "overview" || isHomeHubView(state.view);
  const secretaryActive =
    state.view === "secretary" || isSecretaryHubView(state.view);

  function renderHomeShortcut() {
    return (
      <button
        key="overview"
        type="button"
        className={
          homeActive
            ? "shortcut-link active shortcut-home-hub-trigger"
            : "shortcut-link shortcut-home-hub-trigger"
        }
        title="Home — Chief of Staff HQ"
        onClick={handleHomeClick}
      >
        <span className="shortcut-link-short">Home</span>
        {!mobileNav && !collapsed ? (
          <span className="shortcut-link-label">Overview</span>
        ) : null}
      </button>
    );
  }

  function renderSecretaryShortcut() {
    return (
      <button
        key="secretary"
        type="button"
        className={
          secretaryActive
            ? "shortcut-link active shortcut-secretary-hub-trigger"
            : "shortcut-link shortcut-secretary-hub-trigger"
        }
        title="Secretary — Chief of Staff"
        onClick={handleSecretaryClick}
      >
        <span className="shortcut-link-short">Secretary</span>
        {!mobileNav && !collapsed ? (
          <span className="shortcut-link-label">Secretary</span>
        ) : null}
      </button>
    );
  }

  function renderShortcut(item: (typeof PRIMARY_SHORTCUTS)[number]) {
    if (item.view === "overview") return renderHomeShortcut();
    if (item.view === "secretary") return renderSecretaryShortcut();

    return (
      <button
        key={item.view}
        type="button"
        className={state.view === item.view ? "shortcut-link active" : "shortcut-link"}
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
      className={`shortcut-sidebar${collapsed && !mobileNav ? " shortcut-sidebar-collapsed" : ""}${mobileNav ? " shortcut-sidebar-mobile" : ""}`}
      aria-label="Shortcuts"
      style={
        mobileNav
          ? ({ "--shortcut-slot-size": `${slotPercent}%` } as CSSProperties)
          : undefined
      }
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
  operations: "Structure — structures",
  recruitment: "Recruit contractors",
  research: "R&D — firm-wide tech",
  secretary: "Secretary — Chief of Staff",
  office: "Job — task forces & board",
  logbook: "Notes & logbook",
  settings: "Settings",
};
