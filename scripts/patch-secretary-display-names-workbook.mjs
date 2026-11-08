/**
 * Patches balance workbook: secretary display names + legacy gov-program ids/params.
 * Run: node scripts/patch-secretary-display-names-workbook.mjs
 * Close the workbook in Excel first if EBUSY.
 */
import { writeFileSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;

const SECRETARY_NAMES_BY_CODE = {
  Secretary_01: "Surtr",
  Secretary_02: "Xaihi",
  Secretary_03: "Skadi",
  Secretary_04: "Fang Yi",
  Secretary_05: "Tang Tang",
};

const CELL_REPLACEMENTS = [
  ["gessesa_intro", "xaihi_intro"],
  ["lafe_complains", "surtr_complains"],
  ["exec_lafe_beat", "exec_surtr_beat"],
  ["gessesaUnlocked", "xaihiUnlocked"],
  ["gessesaIntroSeen", "xaihiIntroSeen"],
  ["lafe_beat", "surtr_beat"],
  ["Gessesa", "Xaihi"],
  ["Lafe", "Surtr"],
  ["Task force cap", "Team cap"],
  ["task force slot", "team slot"],
  ["task force shifts", "team shifts"],
  ["task-force routes", "team routes"],
  ["Task forces", "Teams"],
  ["task forces", "teams"],
  ["Task force", "Team"],
  ["task force", "team"],
  ["a task force", "a team"],
  ["this task force", "this team"],
  ["pull a task force", "pull a team"],
  ["on a task force", "on a field team"],
];

function replaceInString(value) {
  if (typeof value !== "string" || value === "") return value;
  let next = value;
  for (const [from, to] of CELL_REPLACEMENTS) {
    if (next.includes(from)) next = next.split(from).join(to);
  }
  return next;
}

function patchSecretaryStat(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  let updated = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const code = String(row[0] ?? "").trim();
    const canonical = SECRETARY_NAMES_BY_CODE[code];
    if (!canonical) continue;
    if (String(row[1] ?? "").trim() !== canonical) {
      row[1] = canonical;
      updated += 1;
    }
    rows[i] = row;
  }
  const nextSheet = XLSX.utils.aoa_to_sheet(rows);
  Object.assign(sheet, nextSheet);
  return updated;
}

function patchAllSheetCells(wb) {
  let cells = 0;
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet || !sheet["!ref"]) continue;
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[addr];
        if (!cell || cell.t !== "s" || typeof cell.v !== "string") continue;
        const replaced = replaceInString(cell.v);
        if (replaced !== cell.v) {
          cell.v = replaced;
          cell.w = replaced;
          cells += 1;
        }
      }
    }
  }
  return cells;
}

const workbookPath = resolveWorkbookPath();
const wb = XLSX.readFile(workbookPath);

const statSheet = wb.Sheets["Secretary Stat"];
if (!statSheet) {
  console.error("Missing sheet: Secretary Stat");
  process.exit(1);
}

const statRows = patchSecretaryStat(statSheet);
const cellPatches = patchAllSheetCells(wb);

writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(
  `Patched ${workbookPath}\n  Secretary Stat name rows: ${statRows}\n  String cells updated: ${cellPatches}`,
);
