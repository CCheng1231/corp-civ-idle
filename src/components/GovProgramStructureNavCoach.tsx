import type { Dispatch } from "react";
import type { GameAction, GameState } from "../game/types";
import {
  govStructureCoachPickActive,
  govStructureNavCoachCue,
  govStructureUpgradeCoachAffordBlockedCue,
  govStructureUpgradeCoachBlockedCue,
  govStructureUpgradeCoachCue,
} from "../game/govProgram";
import { GovProgramCoachSpotlight } from "./GovProgramCoachSpotlight";

interface GovProgramStructureNavCoachProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function GovProgramStructureNavCoach({
  state,
  dispatch,
}: GovProgramStructureNavCoachProps) {
  const navCue = govStructureNavCoachCue(state);
  const affordBlockedCue = govStructureUpgradeCoachAffordBlockedCue(state);
  const upgradeCue = govStructureUpgradeCoachCue(state);
  const blockedCue = govStructureUpgradeCoachBlockedCue(state);

  if (affordBlockedCue?.dismissible) {
    return (
      <GovProgramCoachSpotlight
        anchorId={affordBlockedCue.anchorId}
        message={affordBlockedCue.message}
        dimBackground
        dismissible
        dismissLabel={affordBlockedCue.dismissLabel}
        onDismiss={() => dispatch({ type: "GOV_RELEASE_STRUCTURE_COACH" })}
        active
      />
    );
  }

  if (navCue) {
    return (
      <GovProgramCoachSpotlight
        anchorId={navCue.anchorId}
        message={navCue.message}
        dimBackground={!navCue.relaxed}
        active
      />
    );
  }

  if (govStructureCoachPickActive(state)) {
  const upgradeOrBlocked =
    upgradeCue ??
    (blockedCue?.anchorId === "gov-coach-anchor-resource-bar"
      ? null
      : blockedCue);
    if (upgradeOrBlocked) {
      return (
        <GovProgramCoachSpotlight
          anchorId={upgradeOrBlocked.anchorId}
          message={upgradeOrBlocked.message}
          dimBackground={!upgradeOrBlocked.relaxed}
          active
        />
      );
    }
  }

  return null;
}