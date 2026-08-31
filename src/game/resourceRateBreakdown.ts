import { RESEARCH, formatResourceShort } from "./constants";
import { ownedOfficeIds } from "./branchSites";
import {
  formatSiteRateBonusPercent,
  officeDisplayName,
  siteRateBonusesForState,
} from "./mapWorld";
import { RATE_UNIT_LABEL } from "./phaseA";
import { applyRatesForStructureLevels } from "./structureBalance";
import { officePassiveRatesForLocation } from "./unitEffects";
import type { GameState, ProductionRates, ResourceKey } from "./types";

export interface ResourceRateBreakdownLine {
  label: string;
  amount: number;
}

function emptyRates(): ProductionRates {
  return {
    cash: 0,
    supply: 0,
    connection: 0,
    mood: 0,
    reputation: 0,
    govReputation: 0,
  };
}

/** Mirrors `recomputeDerivedStats` — per-source lines for resource bar tooltips. */
export function resourceRateBreakdown(
  state: GameState,
  key: ResourceKey,
): ResourceRateBreakdownLine[] {
  const siteBonuses = siteRateBonusesForState(state);
  const lines: ResourceRateBreakdownLine[] = [];
  let running = 0;

  for (const officeId of ownedOfficeIds(state)) {
    const siteRates = emptyRates();
    applyRatesForStructureLevels(
      state.structureLevelsByLocation[officeId],
      siteRates,
    );
    const base = siteRates[key];
    if (base <= 0) continue;

    const siteBonus = siteBonuses[officeId] ?? 0;
    const adjusted = base * (1 + siteBonus);
    running += adjusted;

    const officeLabel = officeDisplayName(state, officeId);
    const bonusNote =
      siteBonus > 0
        ? ` (+${formatSiteRateBonusPercent(siteBonus)} site)`
        : "";
    lines.push({
      label: `Structures · ${officeLabel}${bonusNote}`,
      amount: adjusted,
    });
  }

  for (const def of RESEARCH) {
    const level = state.researchLevels[def.id];
    if (level <= 0) continue;

    const pct = def.effects.ratePercentPerLevel?.[key];
    if (pct && running > 0) {
      const mult = 1 + pct * level;
      const added = running * (mult - 1);
      lines.push({
        label: `Research · ${def.name} Lv ${level}`,
        amount: added,
      });
      running *= mult;
    }
  }

  for (const officeId of ownedOfficeIds(state)) {
    const passive = officePassiveRatesForLocation(
      state.contractorsByLocation[officeId],
    );
    const delta = passive[key] ?? 0;
    if (delta <= 0) continue;
    lines.push({
      label: `Staff · ${officeDisplayName(state, officeId)}`,
      amount: delta,
    });
    running += delta;
  }

  return lines;
}

export function formatRateAmount(amount: number): string {
  const prefix = amount >= 0 ? "+" : "";
  return `${prefix}${formatResourceShort(amount)}${RATE_UNIT_LABEL}`;
}
