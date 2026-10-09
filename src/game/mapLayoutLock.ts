/** Regional Gov is fixed at 0,0; other landmarks are movable in dev. */
export function isMapDevLandmarkKeyLocked(key: string): boolean {
  return key === "gov";
}
