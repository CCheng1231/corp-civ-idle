import { type Dispatch } from "react";
import { WIN_NET_WORTH, formatResourceShort } from "../game/constants";
import {
  buildMarketResearchLeaderboard,
  isCompanyPresenceActive,
  marketResearchOnlineReady,
} from "../game/marketResearchLeaderboard";
import type { GameAction, GameState } from "../game/types";
import { HubSyncedTabBackground } from "./HubSyncedTabBackground";
import { HubSyncedTabScrollBody } from "./HubSyncedTabScrollBody";
import { ProgressionTabStickyChrome } from "./ProgressionTabStickyChrome";
import { TabPortraitLayout } from "./TabPortraitLayout";

const MARKET_RESEARCH_PORTRAIT_SIZE_KEY =
  "corp-civ-idle-market-research-portrait-size";

interface MarketResearchViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function MarketResearchView({ state, dispatch }: MarketResearchViewProps) {
  const now = Date.now();
  const onlineReady = marketResearchOnlineReady(state);
  const rows = buildMarketResearchLeaderboard(state, now);

  return (
    <div className="main-view-panel location-view-panel secretary-view secretary-market-research-view hub-synced-tab-view hub-synced-tab-view--progression-freeze">
      <HubSyncedTabBackground
        chiefId={state.chiefOfStaffId}
        portraitSource="secretary"
      />
      <div className="progression-tab-frozen-header">
        <ProgressionTabStickyChrome
          secretaryHubTab="marketResearch"
          state={state}
          dispatch={dispatch}
        />
      </div>
      <HubSyncedTabScrollBody>
        <TabPortraitLayout
          storageKey={MARKET_RESEARCH_PORTRAIT_SIZE_KEY}
          portraitSpacer
          portraitLayout="stretch"
          parallaxScroll={false}
          portraitLocked={false}
          allowPortraitResize={false}
          className="tab-portrait-fit"
        >
          {null}
        </TabPortraitLayout>
        <div className="hub-synced-tab-portrait-reveal" aria-hidden />
        <div className="tab-below-portrait market-research-panel">
          <header className="market-research-header">
            <h2>Market Research</h2>
            <p className="muted">
              Firm net worth across the live world — same formula as Home →
              Overview ({formatResourceShort(WIN_NET_WORTH)} win goal).
            </p>
          </header>

          {!onlineReady ? (
            <p className="market-research-offline-note muted">
              {state.onlineSession?.playMode === "online"
                ? "Connecting to the online world… rankings update once your session is live."
                : "Play in Online mode to compare against other directors in your world."}
            </p>
          ) : null}

          {rows.length === 0 ? (
            <p className="muted">No firms on the board yet.</p>
          ) : (
            <div className="market-research-table-wrap">
              <table className="market-research-table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Firm</th>
                    <th scope="col" className="market-research-col-worth">
                      Net worth
                    </th>
                    <th scope="col" className="market-research-col-progress">
                      Goal
                    </th>
                    <th scope="col" className="market-research-col-status">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.accountId}
                      className={
                        row.isSelf
                          ? "market-research-row market-research-row--self"
                          : "market-research-row"
                      }
                    >
                      <td className="market-research-rank">{row.rank}</td>
                      <td className="market-research-firm">
                        {row.displayName}
                        {row.isSelf ? (
                          <span className="market-research-you-pill">You</span>
                        ) : null}
                      </td>
                      <td className="market-research-col-worth">
                        <strong>{row.netWorthLabel}</strong>
                      </td>
                      <td className="market-research-col-progress muted">
                        {row.goalProgressLabel}
                      </td>
                      <td className="market-research-col-status">
                        {onlineReady && isCompanyPresenceActive(row.lastSeenAt, now)
                          ? "Active"
                          : row.lastSeenAt > 0
                            ? "Idle"
                            : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </HubSyncedTabScrollBody>
    </div>
  );
}
