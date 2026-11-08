/**
 * Reads Secretary Stat tab → src/game/secretaryData.ts
 * Run: node scripts/build-secretary-data.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const __dirname = dirname(fileURLToPath(import.meta.url));
const workbookPath = resolveWorkbookPath();
const outTs = join(__dirname, "..", "src", "game", "secretaryData.ts");

const CHIEF_EFFECT_KINDS = new Set([
  "officeProduction",
  "jobWorkTime",
  "recruitCost",
  "recruitTime",
  "travelTime",
]);

const DEFAULT_IN_ROSTER_BY_ID = {
  secretary_01: true,
  secretary_02: false,
  secretary_03: false,
  secretary_04: false,
  secretary_05: false,
};

const DEFAULT_EFFECT_BY_CODE = {
  Secretary_01: "officeProduction",
  Secretary_02: "jobWorkTime",
  Secretary_03: "recruitCost",
  Secretary_04: "recruitTime",
  Secretary_05: "travelTime",
};

function normalizeId(code) {
  return String(code)
    .trim()
    .replace(/^Secretary_/i, "secretary_")
    .toLowerCase();
}

function cell(row, index) {
  const value = row[index];
  return value == null ? "" : String(value).trim();
}

function parseInRoster(raw) {
  const v = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (v === "Y" || v === "YES" || v === "TRUE" || v === "1") return true;
  return false;
}

function parsePct(raw, fallback) {
  if (raw === "" || raw == null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

const DEFAULT_CHIEF_PCT_BY_CODE = {
  Secretary_01: 0.01,
  Secretary_02: -0.01,
  Secretary_03: -0.01,
  Secretary_04: -0.01,
  Secretary_05: -0.01,
};

const TEAM_LEAD_EFFECT_KINDS = new Set([
  "travelTime",
  "jobWorkTime",
  "jobIncome",
  "jobSupplyCost",
  "jobUnitHours",
]);

const DEFAULT_TEAM_LEAD_BY_CODE = {
  Secretary_01: { kind: "travelTime", pct: -0.05 },
  Secretary_02: { kind: "jobWorkTime", pct: -0.05 },
  Secretary_03: { kind: "jobIncome", pct: 0.05 },
  Secretary_04: { kind: "jobSupplyCost", pct: -0.1 },
  Secretary_05: { kind: "jobUnitHours", pct: 0.08 },
};

function parseTeamLeadEffectKind(raw) {
  const v = String(raw ?? "").trim();
  if (TEAM_LEAD_EFFECT_KINDS.has(v)) return v;
  return null;
}

function parseChiefEffectKind(raw) {
  const v = String(raw ?? "").trim();
  if (CHIEF_EFFECT_KINDS.has(v)) return v;
  return null;
}

function defaultReportLine(name) {
  return `Director, ${name} is ready when you are—I have the latest numbers queued for your review.`;
}

function flavourLines(name) {
  return [
    `${name} keeps the executive floor steady when priorities shift.`,
    `Trusted with firm-wide coordination and the details others overlook.`,
  ];
}

function parseSecretaries(wb) {
  const sheet = wb.Sheets["Secretary Stat"];
  if (!sheet) {
    console.error("Missing sheet: Secretary Stat");
    process.exit(1);
  }
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const entries = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const code = cell(row, 0);
    const name = cell(row, 1);
    if (!code || !name) continue;
    const chiefBonus = cell(row, 2);
    const teamLeadBonus = cell(row, 3);
    const reportLine = cell(row, 4) || defaultReportLine(name);
    const id = normalizeId(code);
    const inRosterRaw = cell(row, 5);
    const inRoster =
      inRosterRaw === ""
        ? (DEFAULT_IN_ROSTER_BY_ID[id] ?? false)
        : parseInRoster(inRosterRaw);
    const effectRaw = cell(row, 6);
    const chiefEffectKind =
      effectRaw === ""
        ? parseChiefEffectKind(DEFAULT_EFFECT_BY_CODE[code] ?? "")
        : parseChiefEffectKind(effectRaw);
    const chiefEffectPct = parsePct(
      cell(row, 7),
      DEFAULT_CHIEF_PCT_BY_CODE[code] ?? 0,
    );
    const teamDefaults = DEFAULT_TEAM_LEAD_BY_CODE[code] ?? {
      kind: "travelTime",
      pct: -0.05,
    };
    const teamLeadEffectKind =
      parseTeamLeadEffectKind(cell(row, 9)) ?? teamDefaults.kind;
    const teamLeadEffectPct = parsePct(cell(row, 8), teamDefaults.pct);
    entries.push({
      id,
      code,
      name,
      officeId: "hq",
      inRoster,
      chiefEffectKind,
      chiefEffectPct,
      teamLeadEffectKind,
      teamLeadEffectPct,
      chiefOfStaffBonus: chiefBonus,
      teamLeadBonus: teamLeadBonus,
      reportLine,
      flavour: flavourLines(name),
    });
  }
  if (entries.length === 0) {
    console.error("No secretary rows found in Secretary Stat");
    process.exit(1);
  }
  return entries;
}

function emitTs(entries) {
  const body = entries
    .map((e) => {
      const kind = e.chiefEffectKind
        ? `"${e.chiefEffectKind}"`
        : "null";
      return `  {
    id: "${e.id}",
    code: "${e.code}",
    name: ${JSON.stringify(e.name)},
    officeId: "${e.officeId}",
    inRoster: ${e.inRoster},
    chiefEffectKind: ${kind},
    chiefEffectPct: ${e.chiefEffectPct},
    teamLeadEffectKind: "${e.teamLeadEffectKind}",
    teamLeadEffectPct: ${e.teamLeadEffectPct},
    chiefOfStaffBonus: ${JSON.stringify(e.chiefOfStaffBonus)},
    teamLeadBonus: ${JSON.stringify(e.teamLeadBonus)},
    reportLine: ${JSON.stringify(e.reportLine)},
    flavour: ${JSON.stringify(e.flavour)},
  }`;
    })
    .join(",\n");

  return `/** Generated by scripts/build-secretary-data.mjs — do not edit. */
import type {
  ChiefOfStaffEffectKind,
  OfficeLocationId,
  SecretaryId,
  TeamLeadEffectKind,
} from "./types";

export interface SecretaryDefinition {
  id: SecretaryId;
  code: string;
  name: string;
  /** Office site where this secretary is posted. */
  officeId: OfficeLocationId;
  /** Player-visible on Secretary → Roster (Secretary Stat: In roster). */
  inRoster: boolean;
  /** Which system Chief bonus applies to (Secretary Stat: Chief effect target). */
  chiefEffectKind: ChiefOfStaffEffectKind | null;
  /** Signed percent delta — multiplier 1 + pct (Secretary Stat: chiefEffectPct). */
  chiefEffectPct: number;
  teamLeadEffectKind: TeamLeadEffectKind;
  teamLeadEffectPct: number;
  chiefOfStaffBonus: string;
  teamLeadBonus: string;
  /** In-world line spoken to the Director (Chief of Staff view). */
  reportLine: string;
  flavour: string[];
}

export const DEFAULT_CHIEF_OF_STAFF_ID: SecretaryId = "secretary_01";

export const SECRETARIES: SecretaryDefinition[] = [
${body}
];

export function secretaryById(id: SecretaryId): SecretaryDefinition {
  const found = SECRETARIES.find((entry) => entry.id === id);
  if (!found) {
    throw new Error(\`Unknown secretary id: \${id}\`);
  }
  return found;
}

export const SECRETARY_IDS: SecretaryId[] = SECRETARIES.map((entry) => entry.id);

export function secretariesInPlayerRoster(
  unlocks: Pick<import("./types").GameState, "secretaryUnlocks">["secretaryUnlocks"],
): SecretaryDefinition[] {
  return SECRETARIES.filter((entry) => unlocks[entry.id] === true);
}
`;
}

const wb = XLSX.readFile(workbookPath);
const entries = parseSecretaries(wb);
writeFileSync(outTs, emitTs(entries), "utf8");
console.log(`Wrote ${entries.length} secretaries → ${outTs}`);
