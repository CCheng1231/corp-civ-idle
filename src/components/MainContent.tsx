import { type Dispatch } from "react";
import { OverviewView } from "./OverviewView";
import { WorldView } from "./WorldView";
import { OfficeView } from "./OfficeView";
import { LogbookView } from "./LogbookView";
import { OperationsView } from "./OperationsView";
import { RecruitmentView } from "./RecruitmentView";
import { ResearchView } from "./ResearchView";
import { SettingsView } from "./SettingsView";
import type { GameAction, GameState } from "../game/types";
import type { OnlineSession } from "../multiplayer/types";

interface MainContentProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  session?: OnlineSession;
}

export function MainContent({ state, dispatch, session }: MainContentProps) {
  switch (state.view) {
    case "overview":
      return <OverviewView state={state} dispatch={dispatch} />;
    case "world":
      return <WorldView state={state} dispatch={dispatch} />;    case "operations":
      return <OperationsView state={state} dispatch={dispatch} />;
    case "recruitment":
      return <RecruitmentView state={state} dispatch={dispatch} />;
    case "research":
      return <ResearchView state={state} dispatch={dispatch} />;
    case "office":
      return <OfficeView state={state} dispatch={dispatch} />;
    case "logbook":
      return <LogbookView state={state} dispatch={dispatch} />;
    case "settings":
      return (
        <SettingsView state={state} dispatch={dispatch} session={session} />
      );
    default:
      return <OperationsView state={state} dispatch={dispatch} />;
  }
}
