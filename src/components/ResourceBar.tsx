import {
  aggregateCategoryRoster,
  RESOURCE_LABELS,
  RESOURCE_BAR_KEYS,
  normalizeResourceWallet,
  formatNumber,
  formatResourceFull,
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

  return (
    <div className="resource-chip-wrap">
      <div className="resource-chip" tabIndex={0}>
        <div className="resource-chip-main">
          <span className="resource-label">{label}</span>
          <span className="resource-value">{formatResourceFull(amount)}</span>
          <span className="resource-rate">
            +{formatResourceFull(rate)}
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
      </div>
      <div className="resource-chip-tip" role="tooltip">
        <div className="resource-chip-tip-title">{label}</div>
        <div className="resource-chip-tip-cap">
          {hasCap
            ? `${formatResourceFull(amount)} / ${formatResourceFull(cap!)} cap (${capPercent!.toFixed(1)}%)`
            : `${formatResourceFull(amount)} — no holding cap`}
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
          <span className="net-worth-label">Net worth</span>
          <strong>{formatNumber(state.netWorth)}</strong>
          <span className="net-worth-goal">/ {formatNumber(WIN_NET_WORTH)}</span>
        </div>
        <div className="goal-bar" aria-label="Progress to win condition">
          <div
            className="goal-bar-fill"
            style={{ width: `${goalProgress}%` }}
          />
        </div>
      </div>
    </header>
  );
}
