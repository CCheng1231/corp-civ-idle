import {
  RESOURCE_LABELS,
  RESOURCE_BAR_KEYS,
  normalizeResourceWallet,
  formatNumber,
  formatResourceFull,
  PHASE_LABELS,
  WIN_NET_WORTH,
  aggregateRoster,
  totalWorkforce,
} from "../game/constants";
import { RATE_UNIT_LABEL } from "../game/phaseA";
import {
  computeResourceCaps,
  resourceCapFillClass,
  resourceCapForKey,
} from "../game/structureBalance";
import type { GameState } from "../game/types";

interface ResourceBarProps {
  state: GameState;
}

export function ResourceBar({ state }: ResourceBarProps) {
  const goalProgress = Math.min(100, (state.netWorth / WIN_NET_WORTH) * 100);
  const roster = aggregateRoster(state.contractorsByLocation);
  const resources = normalizeResourceWallet(state.resources);
  const caps = computeResourceCaps(state);
  const staffSummary = `Staff ${totalWorkforce(roster)} · Farm ${roster.farming} · Def ${roster.defense} · Intel ${roster.intel} · Sup ${roster.support}`;

  return (
    <header className="resource-bar">
      <div className="brand">
        <span className="brand-mark">CC</span>
        <strong>Corp Civ Idle</strong>
        <span className="phase-tag">{PHASE_LABELS[state.phase]}</span>
      </div>
      <div className="resource-grid">
        {RESOURCE_BAR_KEYS.map((key) => {
          const amount = resources[key];
          const cap = resourceCapForKey(caps, key);
          const hasCap = cap !== null && cap > 0;
          const capPercent = hasCap
            ? Math.min(100, (amount / cap) * 100)
            : null;
          const tooltip = hasCap
            ? `${RESOURCE_LABELS[key]}: ${formatResourceFull(amount)} / ${formatResourceFull(cap)} cap (${capPercent!.toFixed(1)}%)`
            : `${RESOURCE_LABELS[key]}: ${formatResourceFull(amount)} — no holding cap`;

          return (
            <div
              key={key}
              className="resource-chip"
              title={tooltip}
            >
              <div className="resource-chip-main">
                <span className="resource-label">{RESOURCE_LABELS[key]}</span>
                <span className="resource-value">{formatResourceFull(amount)}</span>
                <span className="resource-rate">
                  +{formatResourceFull(state.rates[key] ?? 0)}
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
                    ? `${RESOURCE_LABELS[key]} ${capPercent!.toFixed(0)}% of cap`
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
          );
        })}
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
