import { useEffect, useRef, useState, type ReactNode } from "react";

/** Galaxy S24 FHD+ 1080×2340 at DPR 3 → CSS/layout pixels. */
export const GALAXY_S24_CSS = { width: 360, height: 780 } as const;
const BEZEL_PAD = 12;
const OUTER_W = GALAXY_S24_CSS.width + BEZEL_PAD * 2;
const OUTER_H = GALAXY_S24_CSS.height + BEZEL_PAD * 2;

interface DevicePreviewFrameProps {
  children: ReactNode;
}

export function DevicePreviewFrame({ children }: DevicePreviewFrameProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => {
      const captionH = captionRef.current
        ? captionRef.current.getBoundingClientRect().height + 10
        : 24;
      const style = getComputedStyle(stage);
      const padX =
        parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const padY =
        parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const availW = Math.max(0, stage.clientWidth - padX);
      const availH = Math.max(0, stage.clientHeight - padY - captionH);
      const next = Math.min(availW / OUTER_W, availH / OUTER_H);
      setScale(Number.isFinite(next) && next > 0 ? next : 1);
    };

    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    measure();
    return () => ro.disconnect();
  }, []);

  return (
    <div className="device-preview-stage" ref={stageRef}>
      <p className="device-preview-caption" ref={captionRef}>
        Galaxy S24 · {GALAXY_S24_CSS.width}×{GALAXY_S24_CSS.height} CSS ·{" "}
        1080×2340 @3× · {Math.round(scale * 100)}%
      </p>
      <div
        className="device-preview-fit"
        style={{
          width: OUTER_W * scale,
          height: OUTER_H * scale,
        }}
      >
        <div
          className="device-preview-scale"
          style={{
            width: OUTER_W,
            height: OUTER_H,
            transform: `scale(${scale})`,
          }}
        >
          <div className="device-preview-bezel">
            <div
              className="device-preview-screen"
              style={{
                width: GALAXY_S24_CSS.width,
                height: GALAXY_S24_CSS.height,
              }}
            >
              <div
                className="device-preview-webview"
                style={{
                  width: GALAXY_S24_CSS.width,
                  height: GALAXY_S24_CSS.height,
                }}
              >
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
