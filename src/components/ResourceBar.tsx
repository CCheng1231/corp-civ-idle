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

  return (
    <header className="resource-bar">
      <div className="brand">
        <span className="brand-mark">CC</span>
        <div>
          <strong>Corp Civ Idle</strong>
          <span className="phase-tag">{PHASE_LABELS[state.phase]}</span>
        </div>
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
              <span className="resource-label">{RESOURCE_LABELS[key]}</span>
              <span className="resource-value">{formatResourceFull(amount)}</span>
              {hasCap && capPercent !== null && (
                <div
                  className="resource-cap-bar"
                  role="meter"
                  aria-valuenow={Math.round(capPercent)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${RESOURCE_LABELS[key]} ${capPercent.toFixed(0)}% of cap`}
                >
                  <div
                    className={`resource-cap-fill ${resourceCapFillClass(capPercent)}`}
                    style={{ width: `${capPercent}%` }}
                  />
                </div>
              )}
              <span className="resource-rate">
                +{formatResourceFull(state.rates[key] ?? 0)}
                {RATE_UNIT_LABEL}
              </span>
            </div>
          );
        })}
      </div>
      <div className="net-worth">
        <span>Net worth · Goal {formatNumber(WIN_NET_WORTH)}</span>
        <strong>{formatNumber(state.netWorth)}</strong>
        <div className="goal-bar" aria-label="Progress to win condition">
          <div
            className="goal-bar-fill"
            style={{ width: `${goalProgress}%` }}
          />
        </div>
        <span className="contractors">
          Staff {totalWorkforce(roster)} · Farm {roster.farming} · Def{" "}
          {roster.defense} · Intel {roster.intel} · Sup {roster.support} · Power
          per office on map
        </span>
      </div>
    </header>
  );
}
