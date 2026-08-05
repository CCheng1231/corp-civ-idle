import { useEffect, useReducer, useState } from "react";
import { AudioControls } from "./components/AudioControls";
import { CompletionAlertToasts } from "./components/CompletionAlertToasts";
import { OfflineWelcomeDialog } from "./components/OfflineWelcomeDialog";
import { ResourceBar } from "./components/ResourceBar";
import { ShortcutSidebar } from "./components/ShortcutSidebar";
import { MainContent } from "./components/MainContent";
import { gameReducer } from "./game/engine";
import { loadGameState, saveGameState } from "./game/save";
import { WIN_NET_WORTH, formatNumber } from "./game/constants";
import { useBgm } from "./hooks/useBgm";
import { useGameLoop } from "./hooks/useGameLoop";
import { useMobileNavLayout } from "./hooks/useMobileNavLayout";
import "./App.css";

function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadGameState);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const viewportPreview = state.settings.viewportPreview ?? "auto";
  const mobileNav = useMobileNavLayout(viewportPreview);
  const viewportClass =
    viewportPreview === "auto" ? "" : ` viewport-preview-${viewportPreview}`;

  useGameLoop(dispatch);
  useBgm(state.settings.masterVolume, state.settings.musicMuted);

  useEffect(() => {
    saveGameState(state);
  }, [state]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${state.settings.uiScale * 100}%`;
  }, [state.settings.uiScale]);

  return (
    <div className={`app-shell${viewportClass}`}>
      {state.pendingOfflineSummary ? (
        <OfflineWelcomeDialog
          summary={state.pendingOfflineSummary}
          dispatch={dispatch}
        />
      ) : null}
      <CompletionAlertToasts
        alerts={state.pendingCompletionAlerts}
        settings={state.settings}
        dispatch={dispatch}
      />
      <div className="app-top-chrome">
        <AudioControls settings={state.settings} dispatch={dispatch} />
        <ResourceBar state={state} />
        {state.won && (
          <div className="victory-banner" role="status">
            <strong>You win!</strong> Net worth reached{" "}
            {formatNumber(WIN_NET_WORTH)} — top of the corporate ladder (for now).
          </div>
        )}
      </div>
      <div
        className={`layout${sidebarCollapsed && !mobileNav ? " layout-sidebar-collapsed" : ""}${mobileNav ? " layout-mobile-nav" : ""}`}
      >
        <ShortcutSidebar
          state={state}
          dispatch={dispatch}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          mobileNav={mobileNav}
        />
        <main className="main-panel">
          <MainContent state={state} dispatch={dispatch} />
        </main>
      </div>
    </div>
  );
}

export default App;
