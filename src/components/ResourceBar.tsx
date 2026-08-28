import { useCallback, useEffect, useRef, useState } from "react";
import {
  aggregateCategoryRoster,
  RESOURCE_LABELS,
  RESOURCE_BAR_KEYS,
  normalizeResourceWallet,
  formatResourceShort,
  PHASE_LABELS,
  WIN_NET_WORTH,
  totalWorkforce,
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
  const tipId = `resource-tip-${resourceKey}`;

  const wrapRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const positionTip = useCallback(() => {
    const wrap = wrapRef.current;
    const tip = tipRef.current;
    if (!wrap || !tip) return;

    const tipRect = tip.getBoundingClientRect();
    const rect = wrap.getBoundingClientRect();
    const margin = 6;
    let left = rect.left;
    let top = rect.bottom + margin;

    if (left + tipRect.width > window.innerWidth - margin) {
      left = window.innerWidth - tipRect.width - margin;
    }
    if (top + tipRect.height > window.innerHeight - margin) {
      top = rect.top - tipRect.height - margin;
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
    window.addEventListener("scroll", run, true);
    window.addEventListener("resize", run);
    return () => {
      window.removeEventListener("scroll", run, true);
      window.removeEventListener("resize", run);
    };
  }, [open, positionTip]);

  return (
    <div
      ref={wrapRef}
      className="resource-chip-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="resource-chip"
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        onBlur={(event) => {
          if (!wrapRef.current?.contains(event.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
      >
        <div className="resource-chip-main">
          <span className="resource-label">{label}</span>
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
      <div
        ref={tipRef}
        id={tipId}
        className={`resource-chip-tip${open ? " resource-chip-tip-visible" : ""}`}
        role="tooltip"
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
          <p className="resource-chip-tip-empty muted">
            No passive sources — build structures or hire staff.
          </p>
        )}
      </div>
    </div>
  );
}

export function ResourceBar({ state }: ResourceBarProps) {
  const goalProgress = Math.min(100, (state.netWorth / WIN_NET_WORTH) * 100);
  const categoryRoster = aggregateCategoryRoster(state.contractorsByLocation);
  const resources = normalizeResourceWallet(state.resources);
  const caps = computeResourceCaps(state);
  const staffTotal =
    totalWorkforce(state.contractorsByLocation.hq) +
    totalWorkforce(state.contractorsByLocation.branch);
  const staffSummary = `Staff ${staffTotal} · Farm ${categoryRoster.farming} · Def ${categoryRoster.defense} · Intel ${categoryRoster.intel} · Sup ${categoryRoster.support}`;

  return (
    <header className="resource-bar">
      <div className="resource-bar-row">
        <div className="brand">
          <span className="brand-mark">CC</span>
          <strong>Corp Civ Idle</strong>
          <span className="phase-tag">{PHASE_LABELS[state.phase]}</span>
        </div>
        <div className="resource-grid">
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
        <div
          className="net-worth"
          title={`${staffSummary}. Power per office on map.`}
        >
          <div className="net-worth-row">
            <span className="net-worth-label">NW</span>
            <strong>{formatResourceShort(state.netWorth)}</strong>
            <span className="net-worth-goal">
              / {formatResourceShort(WIN_NET_WORTH)}
            </span>
          </div>
          <div
            className="goal-bar"
            aria-label={`${goalProgress.toFixed(0)}% to win`}
          >
            <div
              className="goal-bar-fill"
              style={{ width: `${goalProgress}%` }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
