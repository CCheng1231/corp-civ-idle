import { z1CanonicalMajorHubMarkers } from "../src/game/z1LayoutCanonical.ts";
import { worldMapAxialToPixel } from "../src/game/mapWorld.ts";
import { MAP_GOV } from "../src/game/hexLayout.ts";
import { buildZ1MajorHubs } from "../src/game/worldMapMajorHubs.ts";

const gov = worldMapAxialToPixel(MAP_GOV);
const markers = z1CanonicalMajorHubMarkers();
const hubs = buildZ1MajorHubs(markers);
console.log("Gov pixel", gov);
for (let i = 0; i < markers.length; i += 1) {
  const m = markers[i];
  const dx = m.x - gov.x;
  const dy = m.y - gov.y;
  const dist = Math.hypot(dx, dy);
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const h = hubs[i];
  const clock = ((90 - deg) / 30 + 12) % 12;
  console.log(
    `Hub ${i + 1}: pin (${m.x.toFixed(0)}, ${m.y.toFixed(0)}) dist=${dist.toFixed(0)} angle=${deg.toFixed(0)}° ~${clock.toFixed(1)} o'clock hex ${h?.coord.q},${h?.coord.r}`,
  );
}
