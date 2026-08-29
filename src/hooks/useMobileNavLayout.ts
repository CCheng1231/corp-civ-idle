import { useEffect, useState } from "react";
import type { ViewportPreview } from "../game/types";

const MOBILE_NAV_MQ = "(max-width: 768px)";

function resolveMobileNav(
  viewportPreview: ViewportPreview,
  windowMobile: boolean,
): boolean {
  if (viewportPreview === "mobile" || viewportPreview === "galaxy-s24") {
    return true;
  }
  if (viewportPreview === "desktop") return false;
  return windowMobile;
}

export function useMobileNavLayout(
  viewportPreview: ViewportPreview = "auto",
): boolean {
  const [windowMobile, setWindowMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(MOBILE_NAV_MQ).matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_NAV_MQ);
    const onChange = () => setWindowMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return resolveMobileNav(viewportPreview, windowMobile);
}
