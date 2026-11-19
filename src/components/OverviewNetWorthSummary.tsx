import { WIN_NET_WORTH, formatResourceShort } from "../game/constants";
import type { GameState } from "../game/types";

/** Same banner slot + layout as Build tab Space / Power (`OfficeSiteSummary`). */
export function OverviewNetWorthSummary({ state }: { state: GameState }) {
  const pct =
    WIN_NET_WORTH <= 0
      ? 0
      : Math.min(100, Math.floor((state.netWorth / WIN_NET_WORTH) * 100));
  return (
    <div
      className="office-site-summary office-site-summary-banner office-site-summary-banner--capacity-only"
      aria-label={`Net worth ${formatResourceShort(state.netWorth)} of ${formatResourceShort(WIN_NET_WORTH)} goal`}
    >
      <div className="office-site-capacity-row">
        <div className="office-site-capacity-stat">
          <span className="office-site-capacity-label">Net worth</span>
          <span className="office-site-capacity-values">
            <strong>
              {formatResourceShort(state.netWorth)} /{" "}
              {formatResourceShort(WIN_NET_WORTH)}
            </strong>
          </span>
        </div>
        <div className="office-site-capacity-stat">
          <span className="office-site-capacity-label">Win goal</span>
          <span className="office-site-capacity-values">
            <span className="office-site-capacity-free">{pct}%</span>
          </span>
        </div>
      </div>
    </div>
  );
}