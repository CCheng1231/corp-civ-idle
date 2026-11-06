import {
  RESEARCH_CATEGORY_LABELS,
  RESEARCH_CATEGORY_ORDER,
  STRUCTURE_CATEGORY_LABELS,
  STRUCTURE_CATEGORY_ORDER,
} from "../game/constants";
import type {
  ContractorCategoryId,
  ResearchCategory,
  StructureCategory,
} from "../game/types";

export type ProgressionCatalogInfoKind =
  | "structures"
  | "recruitment"
  | "research"
  | "worldMap"
  | "govProgram";

export interface ProgressionCatalogInfoSection {
  heading: string;
  body: string;
}

const STRUCTURE_CATEGORY_BODIES: Record<StructureCategory, string> = {
  essentials:
    "Day-to-day generators—desks, supply lines, outreach, and morale rooms. These are your main source of cash, supply, mood, and reputation (RRS) per hour.",
  departments:
    "Site scale and limits—expansion, finance, logistics, and landmark builds. Use these when you need more capacity, storage, or department throughput.",
  infrastructure:
    "Power and the research desk. Keep generation and R&D infrastructure online so firm-wide research can run and advanced builds stay powered.",
  staffing:
    "Hiring infrastructure—recruitment desks and training rooms. Upgrade here to unlock contractor roles on the Recruit tab.",
};

const RESEARCH_CATEGORY_BODIES: Record<ResearchCategory, string> = {
  resources:
    "Efficiency manuals—raise how much cash, supply, mood, reputation, and related stats your offices generate per hour.",
  mult:
    "Payout research—improve bid math and job economics so tower contracts and completions pay more.",
  discover:
    "Blueprint unlocks—new rows on the Build tab (generators, rooms, recruitment structures) once a project finishes.",
  unlock:
    "Firm operations—branch rules, portfolio scale, and other systems that change how far you can expand on the map.",
};

const RECRUITMENT_CATEGORY_ORDER: ContractorCategoryId[] = [
  "farming",
  "defense",
  "intel",
  "support",
  "special",
];

const RECRUITMENT_CATEGORY_LABELS: Record<ContractorCategoryId, string> = {
  farming: "Resource farming",
  defense: "Protection & defense",
  intel: "Intel & scouting",
  support: "Support",
  special: "Special",
};

const RECRUITMENT_CATEGORY_BODIES: Record<ContractorCategoryId, string> = {
  farming:
    "Payout-focused crews for map jobs—strong on cash, supply, and completion bonuses from field work.",
  defense:
    "Front-line contractors for risky contracts—security, intimidation, and holding ground on hostile jobs.",
  intel:
    "Scouting and data roles—finding angles, softening targets, and intel that makes jobs easier to finish.",
  support:
    "Logistics and office backbone—couriers, leads, janitorial, and staff who keep missions and sites running.",
  special:
    "Rare hires with unique rules. Most need research and advanced structures before they appear in the roster.",
};

export const PROGRESSION_CATALOG_INFO: Record<
  ProgressionCatalogInfoKind,
  {
    title: string;
    intro: string;
    sections: ProgressionCatalogInfoSection[];
  }
> = {
  structures: {
    title: "Build tab",
    intro:
      "Queue upgrades at the top, then browse by category. Each structure levels independently at this office.",
    sections: STRUCTURE_CATEGORY_ORDER.map((category) => ({
      heading: STRUCTURE_CATEGORY_LABELS[category],
      body: STRUCTURE_CATEGORY_BODIES[category],
    })),
  },
  recruitment: {
    title: "Recruit tab",
    intro:
      "Hire contractors into this office’s roster. One unit type can be in the hiring queue at a time—pick a role, set quantity, and queue.",
    sections: RECRUITMENT_CATEGORY_ORDER.map((category) => ({
      heading: RECRUITMENT_CATEGORY_LABELS[category],
      body: RECRUITMENT_CATEGORY_BODIES[category],
    })),
  },
  research: {
    title: "Research tab",
    intro:
      "Projects are firm-wide—levels apply everywhere. Queue work at the top for the selected office; browse categories below to start the next level.",
    sections: RESEARCH_CATEGORY_ORDER.map((category) => ({
      heading: RESEARCH_CATEGORY_LABELS[category],
      body: RESEARCH_CATEGORY_BODIES[category],
    })),
  },
  worldMap: {
    title: "World map",
    intro:
      "Scout the hex grid, measure distances from your offices, take tower jobs, and establish branches on eligible lots.",
    sections: [
      {
        heading: "Navigate",
        body:
          "Drag to pan. Use the zoom cluster (bottom-left) or pinch/wheel. Home (top-right) jumps to your selected office at 100% zoom. The header dropdown sets which office distance is shown on hexes.",
      },
      {
        heading: "Inspect a hex",
        body:
          "Tap a hex to open the drawer—terrain, travel cost, commercial lots, branch status, and actions like establish or travel when rules allow.",
      },
      {
        heading: "Jobs",
        body:
          "The Jobs panel lists active tower postings. Filter by tier or type, tap a row to highlight its hex on the map, then engage crews from Secretary.",
      },
      {
        heading: "Your offices & travel",
        body:
          "HQ and branch towers mark sites you own. During missions, paths and icons show crews moving across hexes between job sites and home offices.",
      },
      {
        heading: "Filter (landmarks)",
        body:
          "Filter toggles shared world landmark art on your screen only—canon geography is the same for everyone; visibility is per account.",
      },
    ],
  },
  govProgram: {
    title: "Gov't Prog",
    intro:
      "Regional outreach—guided growth stipends, executive attaché steps at ten lifetime hires, and rotating daily contracts. Progress is saved with your company.",
    sections: [
      {
        heading: "Growth track",
        body:
          "Optional tutorial chain with small RSS rewards. Accept on this tab or decline to play without guided steps (you still unlock Gessesa at ten hires).",
      },
      {
        heading: "Executive path",
        body:
          "If you accepted growth, hiring ten contractors pauses growth for a one-time charter here. Skip charter anytime to unlock Gessesa without the field lesson.",
      },
      {
        heading: "Job lock",
        body:
          "During the charter step, normal job engages are blocked until you complete or skip the program charter on this tab—not on the Job board.",
      },
      {
        heading: "Daily contract",
        body:
          "Claim a stipend once per day when the listed objective is met. Weekly and monthly pools are planned for later updates.",
      },
    ],
  },
};
