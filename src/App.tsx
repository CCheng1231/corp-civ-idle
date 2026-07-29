import { useEffect, useReducer, useState } from "react";
import { ResourceBar } from "./components/ResourceBar";
import { ShortcutSidebar } from "./components/ShortcutSidebar";
import { MainContent } from "./components/MainContent";
import { gameReducer } from "./game/engine";
import { loadGameState, saveGameState } from "./game/save";
import { WIN_NET_WORTH, formatNumber } from "./game/constants";
import { useGameLoop } from "./hooks/useGameLoop";
import "./App.css";

function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadGameState);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useGameLoop(dispatch);

  useEffect(() => {
    saveGameState(state);
  }, [state]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${state.settings.uiScale * 100}%`;
  }, [state.settings.uiScale]);

  return (
    <div className="app-shell">
      <div className="app-top-chrome">
        <ResourceBar state={state} />
        {state.won && (
          <div className="victory-banner" role="status">
            <strong>You win!</strong> Net worth reached{" "}
            {formatNumber(WIN_NET_WORTH)} — top of the corporate ladder (for now).
          </div>
        )}
      </div>
      <div
        className={`layout${sidebarCollapsed ? " layout-sidebar-collapsed" : ""}`}
      >
        <ShortcutSidebar
          state={state}
          dispatch={dispatch}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />
        <main className="main-panel">
          <MainContent state={state} dispatch={dispatch} />
        </main>
      </div>
    </div>
  );
}

export default App;
