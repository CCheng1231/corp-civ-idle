import { generateHexagonMap } from "../src/game/hexLayout.ts";
import {
  worldMapHexBounds,
  worldMapOuterGreenbeltRadiusPx,
  MAP_VIEWBOX_PAD,
} from "../src/game/mapWorld.ts";

import { MAP_RADIUS } from "../src/game/hexLayout.ts";

const b = worldMapHexBounds(generateHexagonMap(MAP_RADIUS));
const beltR = worldMapOuterGreenbeltRadiusPx();
const corners = [
  { x: b.minX, y: b.minY },
  { x: b.minX + b.width, y: b.minY },
  { x: b.minX, y: b.minY + b.height },
  { x: b.minX + b.width, y: b.minY + b.height },
];
const maxCorner = Math.max(...corners.map((c) => Math.hypot(c.x, c.y)));
console.log(JSON.stringify({ beltR, MAP_VIEWBOX_PAD, maxCorner, target: beltR + 280 }));
