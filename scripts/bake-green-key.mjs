/**
 * Chroma key for isometric bake masters: bright AI greens + olive #528048 backdrops.
 * Mutates RGBA buffer in place (alpha channel).
 */
export function applyGreenScreenKey(px) {
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    if (g > 140 && g > r + 35 && g > b + 35) {
      px[i + 3] = 0;
    } else if (g >= 88 && g > r + 12 && g > b + 22 && r <= 115 && b <= 88) {
      px[i + 3] = 0;
    } else if (g > 100 && g > r + 20 && g > b + 20) {
      px[i + 3] = Math.min(px[i + 3], Math.max(0, 255 - (g - 100) * 4));
    }
  }
}
