const OFFICE_STORAGE_KEY = "corp-civ-idle-office-category-open";
const RECRUIT_STORAGE_KEY = "corp-civ-idle-recruit-category-open";
const RESEARCH_STORAGE_KEY = "corp-civ-idle-research-category-open";

type OpenMap = Record<string, Record<string, boolean>>;

function readAll(storageKey: string): OpenMap {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as OpenMap;
  } catch {
    return {};
  }
}

function getStoredOpen(
  storageKey: string,
  scopeId: string,
  category: string,
): boolean | undefined {
  const value = readAll(storageKey)[scopeId]?.[category];
  return typeof value === "boolean" ? value : undefined;
}

function setStoredOpen(
  storageKey: string,
  scopeId: string,
  category: string,
  open: boolean,
): void {
  const all = readAll(storageKey);
  all[scopeId] = { ...all[scopeId], [category]: open };
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(all));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Last open/closed choice for an Office category, if the player has toggled it. */
export function getOfficeCategoryOpen(
  officeId: string,
  category: string,
): boolean | undefined {
  return getStoredOpen(OFFICE_STORAGE_KEY, officeId, category);
}

export function setOfficeCategoryOpen(
  officeId: string,
  category: string,
  open: boolean,
): void {
  setStoredOpen(OFFICE_STORAGE_KEY, officeId, category, open);
}

export function getRecruitCategoryOpen(
  officeId: string,
  category: string,
): boolean | undefined {
  return getStoredOpen(RECRUIT_STORAGE_KEY, officeId, category);
}

export function setRecruitCategoryOpen(
  officeId: string,
  category: string,
  open: boolean,
): void {
  setStoredOpen(RECRUIT_STORAGE_KEY, officeId, category, open);
}

export function getResearchCategoryOpen(
  officeId: string,
  category: string,
): boolean | undefined {
  return getStoredOpen(RESEARCH_STORAGE_KEY, officeId, category);
}

export function setResearchCategoryOpen(
  officeId: string,
  category: string,
  open: boolean,
): void {
  setStoredOpen(RESEARCH_STORAGE_KEY, officeId, category, open);
}
