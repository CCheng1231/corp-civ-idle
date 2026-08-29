/** Dev-only device frames. Logical CSS viewports, not hardware pixels. */

export const GALAXY_S24_PORTRAIT = {
  id: "galaxy-s24" as const,
  /** Settings button label */
  label: "Galaxy S24 · portrait",
  /** CSS viewport: 1080×2340 physical at 3× DPR */
  width: 360,
  height: 780,
  dpr: 3,
};

export const DEVICE_PREVIEW_BEZEL_PAD = 12;

export function isGalaxyS24Preview(): boolean {
  return (
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("viewport-preview-galaxy-s24")
  );
}
