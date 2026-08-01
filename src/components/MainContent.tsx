import { type Dispatch } from "react";
import { OverviewView } from "./OverviewView";
import { WorldView } from "./WorldView";
import { OfficeView } from "./OfficeView";
import { LogbookView } from "./LogbookView";
import { OperationsView } from "./OperationsView";
import { ResearchView } from "./ResearchView";
import { SettingsView } from "./SettingsView";
import { ProjectPanel } from "./ProjectPanel";
import type { GameAction, GameState } from "../game/types";

interface MainContentProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function MainContent({ state, dispatch }: MainContentProps) {
  switch (state.view) {
    case "overview":
      return <OverviewView state={state} />;
    case "world":
      return (
        <>
          <WorldView state={state} dispatch={dispatch} />
          <ProjectPanel state={state} dispatch={dispatch} />
        </>
      );
    case "operations":
      return <OperationsView state={state} dispatch={dispatch} />;
    case "research":
      return <ResearchView state={state} dispatch={dispatch} />;
    case "office":
      return <OfficeView state={state} dispatch={dispatch} />;
    case "logbook":
      return <LogbookView state={state} dispatch={dispatch} />;
    case "settings":
      return <SettingsView state={state} dispatch={dispatch} />;
    default:
      return <OperationsView state={state} dispatch={dispatch} />;
  }
}
