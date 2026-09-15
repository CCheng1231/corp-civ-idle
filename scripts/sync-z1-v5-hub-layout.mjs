/**
 * Canonical six major hub pins (pass 1 v5) — Chris redline Sep 14.
 * ONLY hub 4 @ 12h in greenbelt; five outers on spokes past forest ring.
 */
import { writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  worldMapHexBounds,
  worldMapOuterGreenbeltRadiusPx,
  Z1_MAJOR_HUB_OUTSIDE_BELT_PX,
} from "../src/game/mapWorld.ts";
import { MAP_RADIUS, generateHexagonMap } from "../src/game/hexLayout.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const canonPath = resolve(__dirname, "../src/assets/z1-layout-canonical.json");

const beltR = worldMapOuterGreenbeltRadiusPx();
const bounds = worldMapHexBounds(generateHexagonMap(MAP_RADIUS));
const OUTSIDE_R = beltR + Z1_MAJOR_HUB_OUTSIDE_BELT_PX;
const OUTSIDE_FAR_R = beltR + Z1_MAJOR_HUB_OUTSIDE_BELT_PX + 50;
const OUTSIDE_FAR_R2 = beltR + Z1_MAJOR_HUB_OUTSIDE_BELT_PX + 130;
const BELT_HUB_R = beltR * 0.93;

function clockToRad(hour) {
  return ((hour - 12) / 12) * Math.PI * 2;
}

function fromClock(hour, dist) {
  const a = clockToRad(hour);
  return { x: Math.sin(a) * dist, y: -Math.cos(a) * dist };
}

function insideView(p) {
  const pad = 24;
  return (
    p.x >= bounds.minX + pad &&
    p.x <= bounds.minX + bounds.width - pad &&
    p.y >= bounds.minY + pad &&
    p.y <= bounds.minY + bounds.height - pad
  );
}

function zone(dist) {
  if (dist > beltR + 45) return "outside";
  if (dist < beltR - 45) return "inner";
  return "belt";
}

/** Clock hour on map face (12=north); fractional ok (10.5 = 10:30). */
const LAYOUT = [
  { hour: 12, dist: BELT_HUB_R, label: "12h — only hub in belt" },
  { hour: 9, dist: OUTSIDE_R, label: "9h — west lake (outer)" },
  { hour: 5, dist: OUTSIDE_R, label: "5h — SE outer (keep)" },
  { hour: 1.5, dist: OUTSIDE_FAR_R2, label: "1:30h — NE far (arrow)" },
  { hour: 7.25, dist: OUTSIDE_FAR_R, label: "~7:15h — SW plains (from 6h arrow)" },
  { hour: 10.25, dist: OUTSIDE_FAR_R2, label: "10:15h — NW lakes (arrow)" },
];

const markers = LAYOUT.map((s) => fromClock(s.hour, s.dist));

const prev = JSON.parse(readFileSync(canonPath, "utf8"));
writeFileSync(
  canonPath,
  `${JSON.stringify(
    {
      ...prev,
      note:
        "Z1 v5 redline: hub4 @12h belt only; 1@9h,2@2h,3@3:30h,5@6h,6@10:30h outside.",
      majorHubMarkers: markers,
    },
    null,
    2,
  )}\n`,
);

console.log("beltR", beltR.toFixed(1), "outsideR", OUTSIDE_R.toFixed(1));
LAYOUT.forEach((s, i) => {
  const p = markers[i];
  const d = Math.hypot(p.x, p.y);
  console.log(
    `Hub ${i + 1}: ${s.label} dist=${d.toFixed(0)} [${zone(d)}] inView=${insideView(p)}`,
  );
});
