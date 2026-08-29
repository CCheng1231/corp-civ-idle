import { useEffect, useReducer, useState } from "react";
import { AccountGate } from "./components/AccountGate";
import { CompletionAlertToasts } from "./components/CompletionAlertToasts";
import { DevicePreviewFrame } from "./components/DevicePreviewFrame";
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
import { useOnlineWorld } from "./hooks/useOnlineWorld";
import { readSession, writeSession } from "./multiplayer/session";
import type { OnlineSession } from "./multiplayer/types";
import { isOnlineSession } from "./multiplayer/types";
import "./App.css";

function GameShell({ session }: { session: OnlineSession }) {
  const [state, dispatch] = useReducer(
    gameReducer,
    session,
    (s) => loadGameState(s),
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const viewportPreview = state.settings.viewportPreview ?? "auto";
  const mobilePreview = viewportPreview === "mobile";
  const galaxyS24Preview = viewportPreview === "galaxy-s24";
  const deviceFramePreview = mobilePreview || galaxyS24Preview;
  const mobileNav = useMobileNavLayout(viewportPreview);
  const online = isOnlineSession(session);

  useOnlineWorld({
    session,
    state,
    dispatch,
    enabled: online,
  });

  useGameLoop(dispatch);
  useBgm(state.settings.masterVolume, state.settings.musicMuted);

  useEffect(() => {
    saveGameState(state);
  }, [state]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${state.settings.uiScale * 100}%`;
  }, [state.settings.uiScale]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("viewport-preview-galaxy-s24", deviceFramePreview);
    return () => root.classList.remove("viewport-preview-galaxy-s24");
  }, [deviceFramePreview]);

  const viewportClass = [
    viewportPreview === "desktop" ? "viewport-preview-desktop" : "",
    deviceFramePreview ? "viewport-preview-mobile viewport-preview-galaxy-s24" : "",
    mobileNav ? "app-shell-mobile-nav" : "",
    online ? "app-shell-online" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const shell = (
    <div className={`app-shell${viewportClass ? ` ${viewportClass}` : ""}`}>
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
        <ResourceBar state={state} session={session} />
        {online && state.onlineConnectionStatus ? (
          <div
            className={`online-status-banner online-status-${state.onlineConnectionStatus}`}
            role="status"
          >
            Online · {state.onlineConnectionStatus}
          </div>
        ) : null}
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
          <MainContent state={state} dispatch={dispatch} session={session} />
        </main>
      </div>
    </div>
  );

  return deviceFramePreview ? (
    <DevicePreviewFrame>{shell}</DevicePreviewFrame>
  ) : (
    shell
  );
}

function App() {
  const [session, setSession] = useState<OnlineSession | null>(() =>
    readSession(),
  );

  function handleStart(next: OnlineSession) {
    writeSession(next);
    setSession(next);
  }

  if (!session) {
    return <AccountGate onStart={handleStart} />;
  }

  return <GameShell session={session} />;
}

export default App;
