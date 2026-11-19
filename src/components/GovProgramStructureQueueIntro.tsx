import type { Dispatch } from "react";
import type { GameAction } from "../game/types";
import { GovProgramQueueIntro } from "./GovProgramQueueIntro";

interface GovProgramStructureQueueIntroProps {
  dispatch: Dispatch<GameAction>;
}

/** Dialogue after first structure queue — arrow points up at “Structure in progress”. */
export function GovProgramStructureQueueIntro({
  dispatch,
}: GovProgramStructureQueueIntroProps) {
  return (
    <GovProgramQueueIntro
      dispatch={dispatch}
      titleId="gov-structure-queue-intro-title"
      className="gov-program-structure-queue-intro"
      anchorId="gov-program-structure-queue-anchor"
    >
      Now you have queued a structure! It costs resources and real time to finish.
      Let&apos;s see what else you can do while it builds.
    </GovProgramQueueIntro>
  );
}