import { formatNumber } from "../game/constants";

export function formatPreviewValue(
  value: number,
  unit: string,
  label: string,
): string {
  if (label === "Build time") {
    if (value < 1) return `${Math.round(value * 60)} min`;
    return `${formatNumber(Math.round(value * 10) / 10)} hr`;
  }
  if (label === "Cash cap") return `$${formatNumber(value)}`;
  if (unit === "%") return `+${Math.round(value)}%`;
  return `${formatNumber(value)}${unit}`;
}

export function formatPreviewDelta(
  from: number | null,
  to: number,
  unit: string,
  label: string,
): string {
  if (from == null) return formatPreviewValue(to, unit, label);
  const delta = to - from;
  const sign = delta >= 0 ? "+" : "";
  if (label === "Build time") return formatPreviewValue(to, unit, label);
  if (label === "Cash cap") {
    return `${formatPreviewValue(from, unit, label)} → ${formatPreviewValue(to, unit, label)} (${sign}$${formatNumber(Math.abs(delta))})`;
  }
  if (unit === "%") {
    return `${formatPreviewValue(from, unit, label)} → ${formatPreviewValue(to, unit, label)} (${sign}${Math.round(delta)}%)`;
  }
  return `${formatPreviewValue(from, unit, label)} → ${formatPreviewValue(to, unit, label)} (${sign}${formatNumber(delta)}${unit})`;
}

export function formatPreviewText(text: string): string {
  return text;
}

export interface CompactBonusLine {
  label: string;
  from: number | null;
  to: number;
  unit: string;
  text?: string;
}

/** One-line summary for collapsed maxed cards. */
export function formatCompactBonus(lines: CompactBonusLine[]): string {
  if (lines.length === 0) return "";
  return lines
    .map((line) => {
      if (line.text) return line.text;
      const value = formatPreviewValue(line.to, line.unit, line.label);
      if (line.unit === "%" || line.label.includes("cap") || line.label.includes("/hr")) {
        return `${line.label} ${value}`;
      }
      return `${line.label}: ${value}`;
    })
    .join(" · ");
}
