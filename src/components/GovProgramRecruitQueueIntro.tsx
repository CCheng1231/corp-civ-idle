import type { Dispatch } from "react";
import type { GameAction } from "../game/types";
import { GovProgramQueueIntro } from "./GovProgramQueueIntro";

interface GovProgramRecruitQueueIntroProps {
  dispatch: Dispatch<GameAction>;
}

export function GovProgramRecruitQueueIntro({
  dispatch,
}: GovProgramRecruitQueueIntroProps) {
  return (
    <GovProgramQueueIntro
      dispatch={dispatch}
      titleId="gov-recruit-queue-intro-title"
      className="gov-program-recruit-queue-intro"
      anchorId="gov-program-recruit-queue-anchor"
    >
      Now you have queued a hire! It costs resources and takes time to fill the
      order. Keep working toward ten contractors on roster.
    </GovProgramQueueIntro>
  );
}