import { type Dispatch } from "react";
import { secretaryById } from "../game/secretaryData";
import { secretaryHomePortraitSrc } from "../game/secretaryAssets";
import { homeLandingPanStorageKey } from "../game/hubLandingPan";
import type { GameAction, GameState, MainView } from "../game/types";
import { useCoverBackgroundPan } from "../hooks/useCoverBackgroundPan";

interface HomeLandingViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const HOME_DESTINATIONS: {
  panel?: "overview";
  view?: MainView;
  label: string;
}[] = [
  { panel: "overview", label: "Overview" },
  { view: "operations", label: "Structure" },
  { view: "recruitment", label: "Recruit" },
  { view: "research", label: "Research" },
];

export function HomeLandingView({ state, dispatch }: HomeLandingViewProps) {
  const chiefId = state.chiefOfStaffId;
  const chief = secretaryById(chiefId);
  const portrait = secretaryHomePortraitSrc(chiefId);
  const panStorageKey = homeLandingPanStorageKey(chiefId);
  const {
    frameRef,
    dragging,
    backgroundStyle,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  } = useCoverBackgroundPan(portrait, panStorageKey);

  function openDestination(
    destination: (typeof HOME_DESTINATIONS)[number],
  ) {
    if (destination.panel === "overview") {
      dispatch({ type: "SET_HOME_PANEL", panel: "overview" });
      return;
    }
    if (destination.view) {
      dispatch({ type: "SET_VIEW", view: destination.view });
    }
  }

  return (
    <div className="main-view-panel hub-landing-view home-landing-view">
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
        <div className="hub-landing-spacer" aria-hidden="true" />
        <div className="hub-landing-bottom" aria-label="Home destinations">
          <div className="hub-landing-copy-block">
            <h2 id="home-landing-title" className="hub-landing-title">Home</h2>
            <p className="hub-landing-chat">
              {chief.reportLine} — {chief.name}
            </p>
          </div>
          <div className="hub-landing-buttons">
            {HOME_DESTINATIONS.map((destination) => (
              <button
                key={destination.label}
                type="button"
                className="btn hub-landing-nav-btn"
                onClick={() => openDestination(destination)}
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
