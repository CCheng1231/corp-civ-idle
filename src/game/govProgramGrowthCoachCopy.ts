import { secretaryById } from "./secretaryData";

/** Surtr one-liner after each growth step reward card. */
export function govGrowthStepCoachFooter(stepId: string | null | undefined): string {
  const name = secretaryById("secretary_01").name;
  switch (stepId) {
    case "growth_structure":
      return `${name}: Good job. We are now building a good foundation.`;
    case "growth_recruit_push":
      return `${name}: Staff are coming in. Let's see what we can put them to work on.`;
    case "growth_map":
      return `${name}: Good ground chosen. We'll line up contracts from here.`;
    case "growth_job":
      return `${name}: First team is on contract. Stay on the reports.`;
    case "growth_report":
      return `${name}: Lesson logged. Research is the next lever.`;
    case "growth_research":
      return `${name}: R&D is in the queue. Branch expansion can wait until we're ready.`;
    case "growth_bm_hired":
      return `${name}: Branch lead on payroll. Expansion is in play when you are.`;
    default:
      return `${name}: Step complete. Keep the momentum.`;
  }
}