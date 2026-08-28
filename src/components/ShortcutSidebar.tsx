import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { GameAction, GameState, MainView } from "../game/types";

const SHORTCUTS: { view: MainView; label: string; short: string }[] = [
  { view: "world", label: "World map", short: "World" },
  { view: "overview", label: "Overview", short: "Home" },
  { view: "operations", label: "Office", short: "Office" },
  { view: "recruitment", label: "Recruit", short: "Recruit" },
  { view: "research", label: "R&D", short: "R&D" },
  { view: "office", label: "Sec", short: "Sec" },
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
  const maxShift = Math.max(0, SHORTCUTS.length - MOBILE_VISIBLE);
  const [shiftIndex, setShiftIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const pointerRef = useRef<{
    id: number;
    startX: number;
    dragging: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobileNav) return;
    const i = SHORTCUTS.findIndex((item) => item.view === state.view);
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
    const slot = width / MOBILE_VISIBLE;
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
      dragging: false,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
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
    finishDrag(event.clientX);
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
  const slotPercent = 100 / MOBILE_VISIBLE;

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
      <nav
        ref={navRef}
        className="shortcut-nav"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
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
  operations: "Office & upgrades",
  recruitment: "Recruit contractors",
  research: "R&D — firm-wide tech",
  office: "Sec — jobs & reports",
  logbook: "Notes & logbook",
  settings: "Settings",
};
