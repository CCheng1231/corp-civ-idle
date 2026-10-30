import { useEffect, useState, type Dispatch } from "react";
import { secretaryById } from "../game/secretaryData";
import { secretaryTabPortraitSrc } from "../game/secretaryAssets";
import { secretaryLandingPanStorageKey } from "../game/hubLandingPan";
import { secretaryTips } from "../game/secretaryBriefing";
import type { GameAction, GameState } from "../game/types";
import { useCoverBackgroundPan } from "../hooks/useCoverBackgroundPan";

const SECRETARY_FOCUS_RAIL_KEY = "corp-civ-idle-secretary-focus-rail-open";

interface SecretaryLandingViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const SECRETARY_DESTINATIONS = [
  { id: "roaster" as const, label: "Roaster" },
  { id: "job" as const, label: "Job" },
  { id: "log" as const, label: "Log" },
];

export function SecretaryLandingView({
  state,
  dispatch,
}: SecretaryLandingViewProps) {
  const chiefId = state.chiefOfStaffId;
  const chief = secretaryById(chiefId);
  const portrait = secretaryTabPortraitSrc(chiefId);
  const panStorageKey = secretaryLandingPanStorageKey(chiefId);
  const tips = secretaryTips(state);
  const [focusRailOpen, setFocusRailOpen] = useState(() => {
    try {
      return localStorage.getItem(SECRETARY_FOCUS_RAIL_KEY) === "true";
    } catch {
      return false;
    }
  });
  const {
    frameRef,
    dragging,
    backgroundStyle,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  } = useCoverBackgroundPan(portrait, panStorageKey);

  useEffect(() => {
    try {
      localStorage.setItem(
        SECRETARY_FOCUS_RAIL_KEY,
        focusRailOpen ? "true" : "false",
      );
    } catch {
      /* ignore */
    }
  }, [focusRailOpen]);

  function openDestination(id: "roaster" | "job" | "log") {
    if (id === "roaster") {
      dispatch({ type: "SET_SECRETARY_PANEL", panel: "roaster" });
      return;
    }
    if (id === "log") {
      dispatch({ type: "SET_SECRETARY_PANEL", panel: "log" });
      return;
    }
    dispatch({ type: "SET_VIEW", view: "office" });
  }

  return (
    <div className="main-view-panel hub-landing-view secretary-landing-view">
      <div
        ref={frameRef}
        className={`hub-landing-portrait-bg${dragging ? " hub-landing-portrait-bg--dragging" : ""}`}
        style={backgroundStyle}
        aria-hidden
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      />
      <div className="hub-landing-overlay">
        {tips.length > 0 ? (
          <div
            className={`secretary-focus-rail${focusRailOpen ? " is-open" : ""}`}
          >
            <button
              type="button"
              className="secretary-focus-rail-toggle"
              aria-expanded={focusRailOpen}
              aria-controls="secretary-focus-rail-panel"
              title={focusRailOpen ? "Hide focus tips" : "Show focus tips"}
              onClick={() => setFocusRailOpen((open) => !open)}
            >
              {focusRailOpen ? "‹" : "›"}
            </button>
            <aside
              id="secretary-focus-rail-panel"
              className="secretary-focus-rail-panel"
              aria-label="Focus for now"
              hidden={!focusRailOpen}
            >
              <h3 className="secretary-focus-rail-title">Focus for now</h3>
              <ul className="secretary-tips-list">
                {tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </aside>
          </div>
        ) : null}
        <div className="hub-landing-spacer" aria-hidden="true" />
        <div className="hub-landing-bottom" aria-label="Secretary destinations">
          <div className="hub-landing-copy-block">
            <h2 id="secretary-landing-title" className="hub-landing-title">
              Secretary
            </h2>
            <p className="hub-landing-chat">
              {chief.reportLine} — {chief.name}
            </p>
          </div>
          <div className="hub-landing-buttons">
            {SECRETARY_DESTINATIONS.map((destination) => (
              <button
                key={destination.id}
                type="button"
                className="btn hub-landing-nav-btn"
                onClick={() => openDestination(destination.id)}
              >
                {destination.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
