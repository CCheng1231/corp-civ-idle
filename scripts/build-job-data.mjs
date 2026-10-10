/**
 * Optional dev import: Job Hub tab → jobHubData.ts
 * Prefer: node scripts/import-balance-from-workbook.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSXNS from "xlsx";
import { resolveBalanceWorkbookFromArgs } from "./lib/resolve-balance-workbook.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const __dirname = dirname(fileURLToPath(import.meta.url));

const outTs = join(__dirname, "..", "src", "game", "jobHubData.ts");
const BALANCE_TS_HEADER = `/** Game balance source of truth — edit in repo. Optional sync: node scripts/import-balance-from-workbook.mjs */`;

const JOB_SHEET_NAMES = ["Job Hub", "Job hub"];

const TOWER_BY_LABEL = {
  "Central Exchange": "metro_central",
  Parkview: "suburban_park",
  Crossroads: "rural_crossing",
  Hillside: "country_estate",
};

const BUSINESS_SLUG = {
  "Theme park": "theme_park",
  Hospital: "hospital",
  "Science lab": "science_lab",
  Restaurant: "restaurant",
  "Retail shop": "retail_shop",
  "Research lab": "research_lab",
  "Big Corp": "big_corp",
  "Start up": "start_up",
  Gov: "gov",
  "Family business": "family_business",
  "Mall management": "mall_management",
};

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function num(v) {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseRate(text) {
  const m = String(text).match(/\$(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}

function findJobSheet(wb) {
  return JOB_SHEET_NAMES.find((name) => wb.SheetNames.includes(name)) ?? null;
}

export function parseJobDefinitionsFromWorkbook(wb) {
  const sheetName = findJobSheet(wb);
  if (!sheetName) {
    throw new Error(`Missing job sheet. Expected one of: ${JOB_SHEET_NAMES.join(", ")}`);
  }

  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
    header: 1,
    defval: "",
  });

  let headerIdx = -1;
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i][7] === "Business Type") {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx < 0) {
    throw new Error("Job Hub design header not found");
  }

  const jobs = [];
  for (let i = headerIdx + 1; i < rows.length; i += 1) {
    const r = rows[i];
    const towerLabel = String(r[0] ?? "").trim();
    const title = String(r[1] ?? "").trim();
    const businessType = String(r[7] ?? "").trim();
    if (!towerLabel || !title || !businessType) continue;

    const tier = num(r[8]);
    if (tier < 1 || tier > 2) continue;

    const id = `${BUSINESS_SLUG[businessType] ?? slugify(businessType)}_${slugify(title)}`;
    jobs.push({
      id,
      towerId: TOWER_BY_LABEL[towerLabel] ?? slugify(towerLabel),
      businessType: BUSINESS_SLUG[businessType] ?? slugify(businessType),
      tier,
      size: String(r[9] ?? "small").trim().toLowerCase(),
      title,
      description: String(r[19] ?? "").trim(),
      durationSec: num(r[2]) || 3600,
      expirationSec: num(r[17]) * 3600 || 82800,
      cashPerUnitHour: parseRate(r[10]),
      unitHoursTotal: num(r[16]) || 100,
      bonusPercent: num(r[18]) || 0.1,
      requiredCategory: String(r[11] ?? "farming").trim().toLowerCase(),
      minUnitTier: Math.max(tier, num(r[12])),
      optionalIntelBoost: String(r[14]).toUpperCase() === "TRUE",
      completionPayout: {},
    });
  }
  return { jobs, sheetName };
}

export function writeJobBalanceTs(jobs) {
  const body = `${BALANCE_TS_HEADER}

import type { JobDefinition } from "./types";

export const JOB_DEFINITIONS: JobDefinition[] = ${JSON.stringify(jobs, null, 2)};
`;
  writeFileSync(outTs, body, "utf8");
  return jobs.length;
}

export function importJobBalanceFromWorkbook(workbookPath) {
  const wb = XLSX.read(readFileSync(workbookPath), { type: "buffer" });
  const { jobs, sheetName } = parseJobDefinitionsFromWorkbook(wb);
  const count = writeJobBalanceTs(jobs);
  return { count, sheetName, jobs };
}

if (process.argv[1]?.includes("build-job-data.mjs")) {
  const workbookPath = resolveBalanceWorkbookFromArgs();
  if (!workbookPath) {
    console.error("No reference workbook. Pass --workbook path or set BALANCE_WORKBOOK_PATH.");
    process.exit(1);
  }
  const { count, sheetName } = importJobBalanceFromWorkbook(workbookPath);
  console.log(`Sheet: ${sheetName}`);
  console.log(`Wrote ${outTs} (${count} job definitions)`);
}
