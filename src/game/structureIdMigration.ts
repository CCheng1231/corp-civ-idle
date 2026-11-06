import type { StructureId, StructureLevels } from "./types";

/** Legacy save / sheet IDs → current StructureId (Nov 2025 reorg). */
export const LEGACY_STRUCTURE_ID_MAP: Record<string, StructureId> = {
  bank_account: "dept_finance",
  storage_room: "dept_logistics",
  dept_b2b: "outreach_program",
};

export function migrateStructureId(id: string): StructureId {
  return (LEGACY_STRUCTURE_ID_MAP[id] ?? id) as StructureId;
}

function zeroStructureLevels(): StructureLevels {
  return {
    office_desk: 0,
    dept_finance: 0,
    office_supply: 0,
    dept_logistics: 0,
    outreach_program: 0,
    break_room: 0,
    social_media: 0,
    video_production_studio: 0,
    press_room: 0,
    company_statue: 0,
    office_expansion: 0,
    power_panel: 0,
    electricity_generator: 0,
    dept_rnd: 0,
    recruitment_desk: 0,
    mit_room: 0,
  };
}

/** Rename keys in a structure level map; merges if both old and new exist. */
export function migrateStructureLevelsMap(
  levels: Partial<Record<string, number>>,
): StructureLevels {
  const base = zeroStructureLevels();
  for (const [key, raw] of Object.entries(levels)) {
    const level = typeof raw === "number" ? raw : 0;
    if (level <= 0) continue;
    const newId = migrateStructureId(key);
    base[newId] = Math.max(base[newId] ?? 0, level);
  }
  return base;
}
