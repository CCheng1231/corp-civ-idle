/**
 * Load committed balance exports from src/game/*.ts without a TS runtime.
 */
import { readFileSync } from "node:fs";

function extractJsonAfterMarker(source, marker) {
  const idx = source.indexOf(marker);
  if (idx < 0) throw new Error(`Marker not found: ${marker}`);
  const eq = source.indexOf("=", idx);
  let i = eq + 1;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  const open = source[i];
  if (open !== "{" && open !== "[") {
    throw new Error(`No JSON start after ${marker}`);
  }
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  for (let j = i; j < source.length; j += 1) {
    const c = source[j];
    if (c === open) depth += 1;
    if (c === close) {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(source.slice(i, j + 1));
      }
    }
  }
  throw new Error(`Unbalanced JSON for ${marker}`);
}

export function loadStructureBalanceTables(tsPath) {
  const source = readFileSync(tsPath, "utf8");
  return extractJsonAfterMarker(source, "STRUCTURE_BALANCE_TABLES");
}

export function loadStructureEffectKind(tsPath) {
  const source = readFileSync(tsPath, "utf8");
  return extractJsonAfterMarker(source, "STRUCTURE_EFFECT_KIND");
}

export function loadResearchDefinitions(tsPath) {
  const source = readFileSync(tsPath, "utf8");
  return extractJsonAfterMarker(source, "RESEARCH_DEFINITIONS");
}

export function loadJobDefinitions(tsPath) {
  const source = readFileSync(tsPath, "utf8");
  return extractJsonAfterMarker(source, "JOB_DEFINITIONS");
}
