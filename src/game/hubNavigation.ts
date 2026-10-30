import type {
  GameState,
  HomeHubResume,
  MainView,
  SecretaryHubResume,
} from "./types";

export const HOME_HUB_MAIN_VIEWS = [
  "operations",
  "recruitment",
  "research",
] as const satisfies readonly MainView[];

export type HomeHubMainView = (typeof HOME_HUB_MAIN_VIEWS)[number];

export function isHomeHubMainView(view: MainView): view is HomeHubMainView {
  return (HOME_HUB_MAIN_VIEWS as readonly MainView[]).includes(view);
}

export function snapshotHomeHubResume(state: GameState): HomeHubResume {
  if (isHomeHubMainView(state.view)) {
    return state.view;
  }
  if (state.view === "overview") {
    return state.homePanel === "overview" ? "overview" : "landing";
  }
  return state.homeHubResume;
}

export function snapshotSecretaryHubResume(state: GameState): SecretaryHubResume {
  if (state.view === "office") {
    return "job";
  }
  if (state.view === "secretary") {
    if (state.secretaryPanel === "roaster") return "roaster";
    if (state.secretaryPanel === "log") return "log";
    return "landing";
  }
  return state.secretaryHubResume;
}

export function isHomeHubActiveView(view: MainView): boolean {
  return view === "overview" || isHomeHubMainView(view);
}

export function isSecretaryHubActiveView(view: MainView): boolean {
  return view === "secretary" || view === "office";
}
