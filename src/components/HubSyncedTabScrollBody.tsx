import { type ReactNode } from "react";
import { useDragScroll } from "../hooks/useDragScroll";

interface HubSyncedTabScrollBodyProps {
  children: ReactNode;
}

export function HubSyncedTabScrollBody({ children }: HubSyncedTabScrollBodyProps) {
  const { dragging, ...dragScroll } = useDragScroll();

  return (
    <div
      className={[
        "location-view-body",
        "hub-synced-tab-scroll-body",
        dragging ? "hub-synced-tab-scroll-dragging" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...dragScroll}
    >
      {children}
    </div>
  );
}
