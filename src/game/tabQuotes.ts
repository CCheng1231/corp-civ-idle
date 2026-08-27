import type { GameState } from "./types";

export type TabQuoteId = "home" | "office" | "research" | "recruitment" | "logbook";

const TAB_QUOTE_SALT: Record<TabQuoteId, number> = {
  home: 1,
  office: 2,
  research: 3,
  recruitment: 4,
  logbook: 5,
};

const HOME_QUOTES = [
  "If the overview looks calm, check the queues twice.",
  "A healthy firm shows progress in every column — not just cash.",
  "Snapshot today; explain the variance tomorrow.",
  "Structures, research, hiring — triage what’s starving.",
  "The overview is where optimism meets the spreadsheet.",
  "One site lagging is a plan; every site lagging is a strategy.",
];

const OFFICE_QUOTES = [
  "Every tower is a line item with a skyline view.",
  "Upgrade the site before the site upgrades your burn rate.",
  "Concrete costs cash; vacancy costs reputation.",
  "Power and supply are opinions until the lights go out.",
  "A well-run office prints money. A neglected one prints excuses.",
  "Demolish with dignity — and document the refund.",
];

const RESEARCH_QUOTES = [
  "Patents are just research that learned to invoice.",
  "The lab doesn’t sleep — but your queue should breathe.",
  "Breakthroughs are scheduled; miracles are back-ordered.",
  "Fund the tree that unlocks the branch you need next quarter.",
  "R&D is a bet. Make sure the odds aren’t house-only.",
  "Every level is a moat — or a very expensive hobby.",
];

const RECRUITMENT_QUOTES = [
  "Headcount is a strategy — contractors are a lifestyle.",
  "Hire for the job board you want, not the one you fear.",
  "The roster is empty until someone signs the paperwork.",
  "Units on site beat units in a slide deck.",
  "Queue the hire; don’t queue the apology to the client.",
  "Talent pipelines leak. Yours should at least drip steadily.",
];

const LOGBOOK_QUOTES = [
  "If it isn’t in the log, it happened in a meeting that didn’t count.",
  "Notes for you; the sheet for auditors who never smile.",
  "Write the gossip down — memory is a hostile witness.",
  "The logbook remembers what the board forgets on purpose.",
  "Good records turn panic into a footnote.",
  "Your notes are strategy. The activity log is archaeology.",
];

const TAB_QUOTES: Record<TabQuoteId, readonly string[]> = {
  home: HOME_QUOTES,
  office: OFFICE_QUOTES,
  research: RESEARCH_QUOTES,
  recruitment: RECRUITMENT_QUOTES,
  logbook: LOGBOOK_QUOTES,
};

export function tabQuote(state: GameState, tab: TabQuoteId): string {
  const quotes = TAB_QUOTES[tab];
  const day = Math.floor(Date.now() / 86_400_000);
  const index =
    (day +
      state.completedProjects * 7 +
      state.jobEngagements.length * 3 +
      TAB_QUOTE_SALT[tab]) %
    quotes.length;
  return quotes[index];
}
