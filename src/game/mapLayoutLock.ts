/**
 * Gov + six major hubs: dev toolbar cannot move them.
 * Positions still come from save overrides (if any) then z1-layout-canonical.json.
 */
export function isMapDevLandmarkKeyLocked(key: string): boolean {
  if (key === "gov") return true;
  return /^major-\d+$/.test(key);
}
