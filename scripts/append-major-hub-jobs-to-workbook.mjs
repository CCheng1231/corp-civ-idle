/**
 * One-time / dev: append major-hub job rows to Job Hub sheet + header cols.
 * Close Excel before running. Then: node scripts/import-balance-from-workbook.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSXNS from "xlsx";
import { resolveBalanceWorkbookFromArgs } from "./lib/resolve-balance-workbook.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const __dirname = dirname(fileURLToPath(import.meta.url));

const MARKER_TITLE = "Cold-chain dock staging";

/** [hubNum, title, business, tier, size, payoutVisible, category, minTier, durationSec, unitHours, expH, bonus, supply, description] */
const ROWS = [
  [
    1,
    "Cold-chain dock staging",
    "Hospital",
    1,
    "small",
    "$6/unit-hour cash",
    "support",
    1,
    3600,
    130,
    23,
    0.1,
    750,
    "Stage insulated totes before hub freight lifts.",
  ],
  [
    1,
    "Lobby crowd flow assist",
    "Big Corp",
    1,
    "mid",
    "$5/unit-hour cash",
    "support",
    1,
    5400,
    180,
    36,
    0.1,
    680,
    "Wayfinding and queue ribbons during peak lobby hours.",
  ],
  [
    2,
    "Retail backroom unload",
    "Retail shop",
    1,
    "small",
    "$7/unit-hour cash",
    "support",
    1,
    3600,
    120,
    23,
    0.1,
    720,
    "Break down pallet wraps and sort totes for floor crews.",
  ],
  [
    2,
    "Parking deck sweep shift",
    "Mall management",
    1,
    "mid",
    "$6/unit-hour cash",
    "support",
    1,
    5400,
    165,
    36,
    0.12,
    800,
    "Debris pickup and signage reset between commuter peaks.",
  ],
  [
    3,
    "Loading bay lane marshal",
    "Big Corp",
    1,
    "small",
    "$6/unit-hour cash",
    "support",
    1,
    3600,
    140,
    23,
    0.1,
    650,
    "Direct courier vans into numbered bay slots.",
  ],
  [
    3,
    "Visitor badge prep",
    "Start up",
    1,
    "mid",
    "$5/unit-hour cash",
    "support",
    1,
    5400,
    175,
    36,
    0.1,
    700,
    "Print and collate guest badges before investor day.",
  ],
  [
    4,
    "Supply cage inventory",
    "Hospital",
    1,
    "small",
    "$7/unit-hour cash",
    "support",
    1,
    3600,
    125,
    23,
    0.1,
    780,
    "Count PPE bins and flag low-stock SKUs.",
  ],
  [
    4,
    "Conference reset crew",
    "Research lab",
    1,
    "mid",
    "$6/unit-hour cash",
    "support",
    1,
    5400,
    170,
    36,
    0.12,
    850,
    "Flip meeting rooms between back-to-back symposium blocks.",
  ],
  [
    5,
    "Freight elevator attend",
    "Big Corp",
    1,
    "small",
    "$6/unit-hour cash",
    "support",
    1,
    3600,
    135,
    23,
    0.1,
    720,
    "Load-leveling for pallet carts during lunch rush.",
  ],
  [
    5,
    "Pop-up kiosk teardown",
    "Retail shop",
    1,
    "mid",
    "$5/unit-hour cash",
    "support",
    1,
    5400,
    160,
    36,
    0.1,
    660,
    "Pack demo fixtures after a limited-run promo.",
  ],
  [
    6,
    "Roof access escort",
    "Gov",
    1,
    "small",
    "$7/unit-hour cash",
    "support",
    1,
    3600,
    115,
    23,
    0.1,
    690,
    "Badge escorts for HVAC contractors on the supertall roof.",
  ],
  [
    6,
    "Emergency kit restock",
    "Hospital",
    1,
    "mid",
    "$6/unit-hour cash",
    "support",
    1,
    5400,
    155,
    36,
    0.12,
    820,
    "Refill floor med kits and log expiry dates.",
  ],
];

function buildRow(spec) {
  const [
    hubNum,
    title,
    business,
    tier,
    size,
    payoutVisible,
    category,
    minTier,
    durationSec,
    unitHours,
    expH,
    bonus,
    supply,
    description,
  ] = spec;
  const hiddenCap = Math.round(unitHours * parseInt(payoutVisible.match(/\$(\d+)/)?.[1] ?? "6", 10));
  const row = new Array(22).fill("");
  row[0] = `Major Hub ${hubNum}`;
  row[1] = title;
  row[2] = durationSec;
  row[3] = "—";
  row[4] = `$${hiddenCap} cash + supply (hidden cap)`;
  row[5] = 0;
  row[6] = 0;
  row[7] = business;
  row[8] = tier;
  row[9] = size;
  row[10] = payoutVisible;
  row[11] = category;
  row[12] = minTier;
  row[13] = "No";
  row[14] = "FALSE";
  row[15] = hiddenCap;
  row[16] = unitHours;
  row[17] = expH;
  row[18] = bonus;
  row[19] = description;
  row[20] = supply;
  row[21] = 0;
  return row;
}

const workbookPath =
  resolveBalanceWorkbookFromArgs() ??
  join(__dirname, "..", "Corp Idle Working.xlsx");

const wb = XLSX.read(readFileSync(workbookPath), { type: "buffer" });
const sheetName = wb.SheetNames.includes("Job Hub") ? "Job Hub" : "Job hub";
const sheet = wb.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

let headerIdx = -1;
for (let i = 0; i < rows.length; i += 1) {
  if (rows[i][7] === "Business Type") {
    headerIdx = i;
    break;
  }
}
if (headerIdx < 0) {
  console.error("Job Hub design header not found");
  process.exit(1);
}

rows[headerIdx][20] = rows[headerIdx][20] || "Completion Supply";
rows[headerIdx][21] = rows[headerIdx][21] || "Completion Cash";

const hasMarker = rows.some((r) => String(r[1] ?? "").trim() === MARKER_TITLE);
if (hasMarker) {
  console.log("Major hub jobs already present in workbook — skipping append.");
} else {
  for (const spec of ROWS) {
    rows.push(buildRow(spec));
  }
}

const nextSheet = XLSX.utils.aoa_to_sheet(rows);
wb.Sheets[sheetName] = nextSheet;
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Updated ${workbookPath} (${ROWS.length} major-hub rows)`);
