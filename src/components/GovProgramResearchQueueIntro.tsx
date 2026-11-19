import type { Dispatch } from "react";
import type { GameAction } from "../game/types";
import { GovProgramQueueIntro } from "./GovProgramQueueIntro";

interface GovProgramResearchQueueIntroProps {
  dispatch: Dispatch<GameAction>;
}

export function GovProgramResearchQueueIntro({
  dispatch,
}: GovProgramResearchQueueIntroProps) {
  return (
    <GovProgramQueueIntro
      dispatch={dispatch}
      titleId="gov-research-queue-intro-title"
      className="gov-program-research-queue-intro"
      anchorId="gov-program-research-queue-anchor"
    >
      Now you have queued research. It costs resources and real time to finish.
      Firm upgrades unlock from completed projects.
    </GovProgramQueueIntro>
  );
}