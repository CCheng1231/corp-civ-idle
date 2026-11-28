/** Keeps full-screen overlays inside the device preview webview when active. */
export function appOverlayPortalRoot(): HTMLElement {
  if (typeof document === "undefined") {
    return null as unknown as HTMLElement;
  }
  return (
    document.querySelector(".device-preview-webview") ??
    document.getElementById("root") ??
    document.body
  );
}