/**
 * Updates Job hub table, Portfolio Management research #20, Bid model copy.
 * Run: node scripts/update-balance-workbook-jobs.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSXNS from "xlsx";

const XLSX = XLSXNS.default ?? XLSXNS;
const __dirname = dirname(fileURLToPath(import.meta.url));
const workbookPath = join(__dirname, "..", "20260731 Corp Idle Working.xlsx");

if (!existsSync(workbookPath)) {
  console.error("Workbook not found:", workbookPath);
  process.exit(1);
}

const wb = XLSX.read(readFileSync(workbookPath), { type: "buffer" });

const jobHubHeader = [
  "Tower",
  "Project",
  "Duration (s)",
  "Min Bid",
  "Total Payout",
  "Intel Req",
  "Rep on Complete",
  "Business Type",
  "Job Tier",
  "Job Size",
  "Payout (visible)",
  "Unit Category",
  "Min Unit Tier",
  "Connection Entry",
  "T1.5 Flag",
  "Total Value (design)",
  "Unit-Hours Total",
  "Expiration (h)",
  "Bonus %",
  "Description",
];

const jobRows = [
  [
    "Central Exchange",
    "Mailroom surge week",
    7200,
    "—",
    "$10,000 cash (hidden cap)",
    0,
    0,
    "Big Corp",
    2,
    "mid",
    "$20/unit-hour cash",
    "farming",
    1,
    "No",
    "FALSE",
    10000,
    500,
    48,
    0.12,
    "Overflow parcel routing for a tower tenant.",
  ],
  [
    "Central Exchange",
    "Office build-out cleanup",
    3600,
    "—",
    "$1,000 cash (hidden cap)",
    0,
    0,
    "Start up",
    1,
    "small",
    "$10/unit-hour cash",
    "farming",
    1,
    "No",
    "FALSE",
    1000,
    100,
    23,
    0.1,
    "Cheap labor wanted for a cramped founder office.",
  ],
  [
    "Central Exchange",
    "Specimen fridge alarm check",
    7200,
    "—",
    "$10,000 cash + supply (hidden cap)",
    0,
    0,
    "Science lab",
    2,
    "mid",
    "$18/unit-hour cash",
    "support",
    1,
    "No",
    "FALSE",
    10000,
    556,
    36,
    0.12,
    "After-hours cold-chain walkthrough.",
  ],
  [
    "Parkview",
    "Seasonal shelf reset",
    5400,
    "—",
    "$1,000 cash (hidden cap)",
    0,
    0,
    "Retail shop",
    1,
    "small",
    "$11/unit-hour cash",
    "farming",
    1,
    "No",
    "FALSE",
    1000,
    91,
    23,
    0.1,
    "Night crew to flip seasonal SKUs.",
  ],
  [
    "Parkview",
    "Parking lot patrol block",
    7200,
    "—",
    "$10,000 cash + connection (hidden cap)",
    0,
    0,
    "Mall management",
    2,
    "mid",
    "$14/unit-hour cash",
    "defense",
    1,
    "No",
    "FALSE",
    10000,
    714,
    48,
    0.15,
    "Weekend security coverage for anchor tenants.",
  ],
  [
    "Parkview",
    "Health inspection prep shift",
    3600,
    "—",
    "$1,000 cash (hidden cap)",
    0,
    0,
    "Restaurant",
    1,
    "small",
    "$13/unit-hour cash",
    "farming",
    1,
    "No",
    "FALSE",
    1000,
    77,
    18,
    0.1,
    "Front-of-house scrub before the health visit.",
  ],
  [
    "Crossroads",
    "After-hours linen run",
    3600,
    "—",
    "$1,000 cash (hidden cap)",
    0,
    0,
    "Hospital",
    1,
    "small",
    "$14/unit-hour cash",
    "support",
    1,
    "No",
    "FALSE",
    1000,
    71,
    23,
    0.1,
    "Laundry carts between rural clinic wings.",
  ],
  [
    "Crossroads",
    "Form processing backlog",
    7200,
    "—",
    "$10,000 cash + GREP (hidden cap)",
    0,
    0,
    "Gov",
    2,
    "mid",
    "$17/unit-hour cash",
    "farming",
    1,
    "No",
    "FALSE",
    10000,
    588,
    48,
    0.12,
    "County paperwork sprint before quarter close.",
  ],
  [
    "Crossroads",
    "Literature review batch",
    10800,
    "—",
    "$10,000 cash + REP (hidden cap)",
    0,
    0,
    "Research lab",
    2,
    "mid",
    "$16/unit-hour cash",
    "intel",
    1,
    "No",
    "FALSE",
    10000,
    625,
    36,
    0.12,
    "Citation cleanup for a grant renewal.",
  ],
  [
    "Hillside",
    "Inventory count weekend",
    7200,
    "—",
    "$1,000 cash (hidden cap)",
    0,
    0,
    "Family business",
    1,
    "small",
    "$12/unit-hour cash",
    "farming",
    1,
    "No",
    "FALSE",
    1000,
    83,
    23,
    0.1,
    "Stocktake for a family-owned shop.",
  ],
  [
    "Hillside",
    "Ride queue crowd control",
    7200,
    "—",
    "$10,000 cash (hidden cap)",
    0,
    0,
    "Theme park",
    2,
    "mid",
    "$15/unit-hour cash",
    "farming",
    1,
    "No",
    "FALSE",
    10000,
    667,
    48,
    0.15,
    "Seasonal gate stewards for a pop-up midway.",
  ],
];

const jobSheet = XLSX.utils.aoa_to_sheet([
  ...XLSX.utils.sheet_to_json(wb.Sheets["Job hub"], { header: 1, defval: "" }).slice(
    0,
    9,
  ),
  jobHubHeader,
  ...jobRows,
]);

wb.Sheets["Job hub"] = jobSheet;

const researchRows = XLSX.utils.sheet_to_json(wb.Sheets.Research, {
  header: 1,
  defval: "",
});
for (let i = 0; i < researchRows.length; i += 1) {
  if (researchRows[i][0] === 20) {
    researchRows[i] = [
      20,
      "Portfolio Management",
      2,
      "Unlock",
      "level 1 Research#7",
      2,
      "+1 concurrent job engagement per level (base cap 3)",
    ];
  }
}
wb.Sheets.Research = XLSX.utils.aoa_to_sheet(researchRows);

const costRows = XLSX.utils.sheet_to_json(wb.Sheets["Research Cost"], {
  header: 1,
  defval: "",
});
for (let i = 0; i < costRows.length; i += 1) {
  if (costRows[i][0] === 20) {
    costRows[i] = [
      20,
      "Portfolio Management",
      2,
      "Unlock",
      0.001,
      100,
      50,
      10,
      0,
      0,
      0,
      1.1,
      "Engagement cap +1 per level",
    ];
  }
}
wb.Sheets["Research Cost"] = XLSX.utils.aoa_to_sheet(costRows);

const bidRows = XLSX.utils.sheet_to_json(wb.Sheets["Bid model"], {
  header: 1,
  defval: "",
});
for (const row of bidRows) {
  if (typeof row[1] === "string") {
    row[1] = row[1]
      .replace(/High school Grad/gi, "Fresh Graduate")
      .replace(/high school grad/gi, "Fresh Graduate");
  }
}
wb.Sheets["Bid model"] = XLSX.utils.aoa_to_sheet(bidRows);

writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log("Updated workbook:", workbookPath);
