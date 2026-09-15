/**
 * Manual hub pin moves (pass 1 v5 regen) — viewBox px, Gov at origin.
 * Clock: 12 = north (-y), 3 = east (+x), 9 = west (-x).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { worldMapOuterGreenbeltRadiusPx } from "../src/game/mapWorld.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const canonPath = resolve(__dirname, "../src/assets/z1-layout-canonical.json");

const beltR = worldMapOuterGreenbeltRadiusPx();
const OUTSIDE_R = beltR + 300;
const IN_BELT_R = beltR * 0.88;

/** Clock hour → radians (0 at 12 o'clock, clockwise). */
function clockToRad(hour) {
  return ((hour - 12) / 12) * Math.PI * 2;
}

function fromClock(hour, dist) {
  const a = clockToRad(hour);
  return { x: Math.sin(a) * dist, y: -Math.cos(a) * dist };
}

function radialSet(x, y, targetDist) {
  const d = Math.hypot(x, y) || 1;
  const s = targetDist / d;
  return { x: x * s, y: y * s };
}

function clockLabel(x, y) {
  const deg = (Math.atan2(-y, x) * 180) / Math.PI;
  const hour = ((deg + 90 + 360) % 360) / 30;
  return `${hour.toFixed(1)}h`;
}

const canon = JSON.parse(readFileSync(canonPath, "utf8"));
const m = [...canon.majorHubMarkers];

// Identify by prior layout (~12h = hub1 north, ~2h hub2, ~5h hub3, belt hub4, ~7h hub5, ~8h hub6)
// User moves:
// - 12 o'clock hub → 9 o'clock, in water, roads expected (hub 1)
m[0] = fromClock(9, OUTSIDE_R);

// - other hub that was also at 12 → green belt (duplicate/stack in bake; use hub 4 slot in belt at ~12h)
m[3] = fromClock(12, IN_BELT_R);

// - 1 o'clock → further to edge (hub 2)
m[1] = fromClock(1, OUTSIDE_R + 85);

// - 10 o'clock → ~330° = 11 o'clock on clock face (hub 6)
m[5] = fromClock(11, OUTSIDE_R);

// Hub 3 (~5h) and 5 (~7h) unchanged unless outside radius needed
m[2] = radialSet(m[2].x, m[2].y, OUTSIDE_R);
m[4] = radialSet(m[4].x, m[4].y, OUTSIDE_R);

canon.note =
  "Z1 pass-1 v5 regen: hub1→9h water; hub4→12h in belt; hub2→1h edge; hub6→11h; 3,5 hold.";
canon.majorHubMarkers = m;

writeFileSync(canonPath, `${JSON.stringify(canon, null, 2)}\n`);

console.log("beltR", beltR, "outsideR", OUTSIDE_R);
m.forEach((p, i) => {
  console.log(
    `Hub ${i + 1}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)}) dist=${Math.hypot(p.x, p.y).toFixed(0)} ~${clockLabel(p.x, p.y)}`,
  );
});
