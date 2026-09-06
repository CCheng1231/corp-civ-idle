import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  RESOURCE_LABELS,
  RESOURCE_BAR_LABELS,
  RESOURCE_BAR_KEYS,
  normalizeResourceWallet,
  formatResourceShort,
} from "../game/constants";
import { RATE_UNIT_LABEL } from "../game/phaseA";
import {
  formatRateAmount,
  resourceRateBreakdown,
} from "../game/resourceRateBreakdown";
import {
  computeResourceCaps,
  resourceCapFillClass,
  resourceCapForKey,
} from "../game/structureBalance";
import type { GameState, ResourceKey } from "../game/types";

interface ResourceBarProps {
  state: GameState;
}

function ResourceChip({
  state,
  resourceKey,
  amount,
  cap,
}: {
  state: GameState;
  resourceKey: ResourceKey;
  amount: number;
  cap: number | null;
}) {
  const hasCap = cap !== null && cap > 0;
  const capPercent = hasCap ? Math.min(100, (amount / cap) * 100) : null;
  const rate = state.rates[resourceKey] ?? 0;
  const breakdown = resourceRateBreakdown(state, resourceKey);
  const label = RESOURCE_LABELS[resourceKey];
  const barLabel = RESOURCE_BAR_LABELS[resourceKey];
  const tipId = `resource-tip-${resourceKey}`;

  const wrapRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hovering || pinned;

  const positionTip = useCallback(() => {
    const wrap = wrapRef.current;
    const tip = tipRef.current;
    if (!wrap || !tip) return;

    const wrapRect = wrap.getBoundingClientRect();
    const margin = 8;
    let left = wrapRect.left;
    let top = wrapRect.bottom + 4;

    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    tip.style.right = "auto";
    tip.style.bottom = "auto";

    const tipRect = tip.getBoundingClientRect();
    if (left + tipRect.width > window.innerWidth - margin) {
      left = window.innerWidth - tipRect.width - margin;
    }
    if (top + tipRect.height > window.innerHeight - margin) {
      top = wrapRect.top - tipRect.height - 4;
    }
    left = Math.max(margin, left);
    top = Math.max(margin, top);
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }, []);

  useEffect(() => {
    const tip = tipRef.current;
    if (!open) {
      if (tip) {
        tip.style.left = "";
        tip.style.top = "";
      }
      return;
    }

    const run = () => positionTip();
    run();
    const frame = requestAnimationFrame(run);
    window.addEventListener("scroll", run, true);
    window.addEventListener("resize", run);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", run, true);
      window.removeEventListener("resize", run);
    };
  }, [open, positionTip]);

  useEffect(() => {
    if (!pinned) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target) || tipRef.current?.contains(target)) {
        return;
      }
      setPinned(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [pinned]);

  const rateLabel = `${rate >= 0 ? "+" : ""}${formatResourceShort(rate)}${RATE_UNIT_LABEL}`;

  return (
    <div
      ref={wrapRef}
      className="resource-chip-wrap"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <button
        type="button"
        className="resource-chip"
        aria-expanded={open}
        aria-label={`${label} ${formatResourceShort(amount)}, ${rateLabel}`}
        aria-describedby={open ? tipId : undefined}
        onClick={() => setPinned((prev) => !prev)}
      >
        <div className="resource-chip-main">
          <span className="resource-label">{barLabel}</span>
          <span className="resource-value">{formatResourceShort(amount)}</span>
          <span className="resource-rate">
            +{formatResourceShort(rate)}
            {RATE_UNIT_LABEL}
          </span>
        </div>
        <div
          className={`resource-cap-bar${hasCap ? "" : " resource-cap-bar--empty"}`}
          role={hasCap ? "meter" : undefined}
          aria-hidden={!hasCap}
          aria-valuenow={hasCap ? Math.round(capPercent!) : undefined}
          aria-valuemin={hasCap ? 0 : undefined}
          aria-valuemax={hasCap ? 100 : undefined}
          aria-label={
            hasCap
              ? `${label} ${capPercent!.toFixed(0)}% of cap`
              : undefined
          }
        >
          {hasCap && capPercent !== null && (
            <div
              className={`resource-cap-fill ${resourceCapFillClass(capPercent)}`}
              style={{ width: `${capPercent}%` }}
            />
          )}
        </div>
      </button>
      {open
        ? createPortal(
            <div
              ref={tipRef}
              id={tipId}
              className="resource-chip-tip resource-chip-tip-visible"
              role="tooltip"
              onMouseEnter={() => setHovering(true)}
              onMouseLeave={() => setHovering(false)}
            >
              <div className="resource-chip-tip-title">{label}</div>
              <div className="resource-chip-tip-cap">
                {hasCap
                  ? `${formatResourceShort(amount)} / ${formatResourceShort(cap!)} cap (${capPercent!.toFixed(1)}%)`
                  : `${formatResourceShort(amount)} — no holding cap`}
              </div>
              <div className="resource-chip-tip-rate-head">
                <span>Rate</span>
                <strong>{formatRateAmount(rate)}</strong>
              </div>
              {breakdown.length > 0 ? (
                <ul className="resource-chip-tip-breakdown">
                  {breakdown.map((line) => (
                    <li key={line.label}>
                      <span>{line.label}</span>
                      <span>{formatRateAmount(line.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="resource-chip-tip-empty">
                  No passive sources — build structures or hire staff.
                </p>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function ResourceBar({ state }: ResourceBarProps) {
  const resources = normalizeResourceWallet(state.resources);
  const caps = computeResourceCaps(state);
  const gridDragRef = useRef<{
    pointerId: number;
    startX: number;
    scrollLeft: number;
    dragging: boolean;
  } | null>(null);

  return (
    <header className="resource-bar">
      <div className="resource-bar-row">
        <div className="brand" title="Corp Civ Idle">
          <span className="brand-mark" aria-hidden="true">
            CC
          </span>
          <strong className="brand-title">Corp Civ Idle</strong>
        </div>
        <div
          className="resource-grid"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            const el = event.currentTarget;
            gridDragRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              scrollLeft: el.scrollLeft,
              dragging: false,
            };
          }}
          onPointerMove={(event) => {
            const drag = gridDragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            const el = event.currentTarget;
            const dx = event.clientX - drag.startX;
            if (!drag.dragging) {
              if (dx * dx < 16) return;
              drag.dragging = true;
              el.setPointerCapture(event.pointerId);
            }
            el.scrollLeft = drag.scrollLeft - dx;
          }}
          onPointerUp={(event) => {
            const drag = gridDragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            if (drag.dragging && event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            gridDragRef.current = null;
          }}
          onPointerCancel={(event) => {
            const drag = gridDragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            if (drag.dragging && event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            gridDragRef.current = null;
          }}
        >
          {RESOURCE_BAR_KEYS.map((key) => (
            <ResourceChip
              key={key}
              state={state}
              resourceKey={key}
              amount={resources[key]}
              cap={resourceCapForKey(caps, key)}
            />
          ))}
        </div>
      </div>
    </header>
  );
}
