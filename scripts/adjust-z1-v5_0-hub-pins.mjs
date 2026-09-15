/**
 * Pass 1 v5.x — canon hub markers vs greenbelt (viewBox px).
 * - Hubs 1,2,3,5,6: clearly OUTSIDE forest belt (open hills)
 * - Hub 4: IN the belt band
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { worldMapOuterGreenbeltRadiusPx } from "../src/game/mapWorld.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const canonPath = resolve(__dirname, "../src/assets/z1-layout-canonical.json");

const beltR = worldMapOuterGreenbeltRadiusPx();
/** Past outer edge of forest ring — hubs must sit in pastoral zone beyond trees */
const OUTSIDE_R = beltR + 300;
const IN_BELT_R = beltR * 0.88;

function radialSet(x, y, targetDist) {
  const d = Math.hypot(x, y) || 1;
  const s = targetDist / d;
  return { x: x * s, y: y * s };
}

const canon = JSON.parse(readFileSync(canonPath, "utf8"));
const m = canon.majorHubMarkers;

const adjusted = m.map((pt, i) => {
  if (i === 3) return radialSet(pt.x, pt.y, IN_BELT_R);
  const dist = Math.hypot(pt.x, pt.y);
  if (dist < OUTSIDE_R) return radialSet(pt.x, pt.y, OUTSIDE_R);
  return pt;
});

canon.note =
  "Z1 pass-1 v5.x pins: 1,2,3,5,6 outside greenbelt; 4 in belt (subject to change).";
canon.majorHubMarkers = adjusted;

writeFileSync(canonPath, `${JSON.stringify(canon, null, 2)}\n`);
console.log("beltR", beltR, "outsideR", OUTSIDE_R, "inBeltR", IN_BELT_R);
adjusted.forEach((p, i) => {
  const d = Math.hypot(p.x, p.y);
  const zone =
    d > beltR + 80 ? "outside" : d < beltR - 80 ? "inner" : "belt";
  console.log(`Hub ${i + 1}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)}) dist=${d.toFixed(0)} ${zone}`);
});
