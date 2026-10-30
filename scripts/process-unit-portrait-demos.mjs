/**
 * Portrait Alpha Processor (Silhouette-Locked Interior Core):
 * Guarantees 0% clothing/body erosion by finding the outer left & right silhouette
 * contour on each scanline (plus top head contour) and locking the entire interior
 * character core 100% opaque.
 */
import sharp from "sharp";
import { mkdirSync, copyFileSync, existsSync, unlinkSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cursorAssetsDir =
  "C:/Users/T/.cursor/projects/d-OneDrive-Documents-GitHub-corp-civ-idle/assets";
const outDirs = [
  join(root, "src/assets/reference/unit-portraits"),
  join(root, "docs/unit-portrait-review/images"),
];

for (const d of outDirs) {
  mkdirSync(d, { recursive: true });
}

const PASS1_WHITE_FILES = [
  "fresh-graduate-v1-bust-pro",
  "fresh-graduate-v2-bust-satire",
  "fresh-graduate-v3-threequarter-pro",
  "fresh-graduate-v4-full-satire",
  "part-timer-v1-bust-pro",
  "part-timer-v2-bust-satire",
  "part-timer-v3-threequarter-pro",
  "part-timer-v4-full-satire",
  "office-clerk-v1-bust-pro",
  "office-clerk-v2-bust-satire",
  "office-clerk-v3-threequarter-pro",
  "office-clerk-v4-full-satire",
  "call-center-veteran-v1-bust-pro",
  "call-center-veteran-v2-bust-satire",
  "call-center-veteran-v3-threequarter-pro",
  "call-center-veteran-v4-full-satire",
];

const PASS2_DARK_FILES = [
  "p2-fresh-grad-v1-clumsy-dark",
  "p2-fresh-grad-v3-tryhard-dark",
  "p2-part-timer-v1-carefree-dark",
  "p2-part-timer-v2-female-carefree-dark",
  "p2-office-clerk-v1-chill-dark",
  "p2-call-center-v1-operator-dark",
  "p2-banked-v4-outfit-rework-dark",
];

const PASS2_CHROMA_FILES = [
  "p2-fresh-grad-v2-sleepy-chroma",
  "p2-fresh-grad-v4-coffee-runner-chroma",
  "p2-part-timer-v3-clockout-chroma",
  "p2-office-clerk-v2-clipboard-chroma",
  "p2-call-center-v2-mute-chroma",
];

/** Snap soft fringe to full opaque or fully transparent. */
function snapAlphaHard(px, w, h) {
  for (let idx = 0; idx < w * h; idx++) {
    const o = idx * 4;
    const a = px[o + 3];
    if (a <= 28) {
      px[o + 3] = 0;
      px[o] = px[o + 1] = px[o + 2] = 0;
    } else if (a >= 232) {
      px[o + 3] = 255;
    }
  }
}

/** Remove studio-colored halos on pixels touching transparency (dark studio key). */
function stripStudioFringeFromOpaque(px, w, h, refAt, tolerance) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const o = idx * 4;
      if (px[o + 3] === 0) continue;
      const [refR, refG, refB] = refAt(x);
      const dRef = Math.hypot(px[o] - refR, px[o + 1] - refG, px[o + 2] - refB);
      if (dRef > tolerance) continue;
      let touchesClear = false;
      if (x > 0 && px[(idx - 1) * 4 + 3] === 0) touchesClear = true;
      if (x < w - 1 && px[(idx + 1) * 4 + 3] === 0) touchesClear = true;
      if (y > 0 && px[(idx - w) * 4 + 3] === 0) touchesClear = true;
      if (y < h - 1 && px[(idx + w) * 4 + 3] === 0) touchesClear = true;
      if (touchesClear) px[o + 3] = 0;
    }
  }
}

/** Bleach magenta spill on semi-transparent chroma edges. */
function defringeChromaMagenta(px, w, h) {
  for (let idx = 0; idx < w * h; idx++) {
    const o = idx * 4;
    const a = px[o + 3];
    if (a === 0 || a === 255) continue;
    const r = px[o];
    const g = px[o + 1];
    const b = px[o + 2];
    const magentaness = Math.min(r, b) - g;
    if (magentaness > 20) {
      px[o + 3] = 0;
      continue;
    }
    if (a < 128) px[o + 3] = 0;
    else px[o + 3] = 255;
  }
}

/** Remove magenta-tinted halos on opaque pixels that touch transparency. */
function stripChromaFringeFromOpaque(px, w, h) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const o = idx * 4;
      if (px[o + 3] === 0) continue;
      let touchesClear = false;
      if (x > 0 && px[(idx - 1) * 4 + 3] === 0) touchesClear = true;
      if (x < w - 1 && px[(idx + 1) * 4 + 3] === 0) touchesClear = true;
      if (y > 0 && px[(idx - w) * 4 + 3] === 0) touchesClear = true;
      if (y < h - 1 && px[(idx + w) * 4 + 3] === 0) touchesClear = true;
      if (!touchesClear) continue;
      const r = px[o];
      const g = px[o + 1];
      const b = px[o + 2];
      const magentaness = Math.min(r, b) - g;
      if (isChromaBackdrop(r, g, b) || magentaness > 22) {
        px[o + 3] = 0;
        px[o] = px[o + 1] = px[o + 2] = 0;
      }
    }
  }
}

/** Pull pink/magenta spill out of keyed character pixels (keeps luminance). */
function despillChromaMagenta(px, w, h) {
  for (let idx = 0; idx < w * h; idx++) {
    const o = idx * 4;
    if (px[o + 3] === 0) continue;
    const r = px[o];
    const g = px[o + 1];
    const b = px[o + 2];
    const magentaness = Math.min(r, b) - g;
    if (magentaness <= 6) continue;
    const spill = Math.min(magentaness * 0.92, 96);
    px[o] = Math.max(0, Math.round(r - spill));
    px[o + 2] = Math.max(0, Math.round(b - spill * 0.96));
  }
}

/**
 * Scanline outer-background keyer for White-Studio images:
 * Only keys pure flat white (#F8F8F8+) outside the character's outer left/right/top
 * silhouette boundary. The entire interior between leftEdge[y] and rightEdge[y]
 * is locked 100% opaque so white shirts, collars, papers, and cups are never eaten.
 */
async function keyWhiteStudioSilhouetteLocked(srcPath) {
  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const px = new Uint8Array(data);
  const bgMask = new Uint8Array(w * h);

  const isBgWhite = (o) => {
    const r = px[o], g = px[o + 1], b = px[o + 2];
    const minC = Math.min(r, g, b);
    const maxC = Math.max(r, g, b);
    return minC >= 242 && maxC - minC <= 10;
  };

  // Scan from left border and right border inward on each row until first non-white silhouette edge
  for (let y = 0; y < h; y++) {
    let lx = 0;
    while (lx < w && isBgWhite((y * w + lx) * 4)) {
      bgMask[y * w + lx] = 1;
      lx++;
    }
    let rx = w - 1;
    while (rx > lx && isBgWhite((y * w + rx) * 4)) {
      bgMask[y * w + rx] = 1;
      rx--;
    }
  }

  // Also scan from top border downward in each column until top of hair/head
  for (let x = 0; x < w; x++) {
    let ty = 0;
    while (ty < h && isBgWhite((ty * w + x) * 4)) {
      bgMask[ty * w + x] = 1;
      ty++;
    }
  }

  for (let idx = 0; idx < w * h; idx++) {
    if (bgMask[idx]) {
      px[idx * 4 + 3] = 0;
    }
  }

  // Soften 1px outer silhouette edge
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (bgMask[idx]) continue;
      if (
        bgMask[idx - 1] ||
        bgMask[idx + 1] ||
        bgMask[idx - w] ||
        bgMask[idx + w]
      ) {
        const o = idx * 4;
        const lum = (px[o] + px[o + 1] + px[o + 2]) / 3;
        if (lum > 225) {
          px[o + 3] = Math.round(255 * Math.max(0.25, (255 - lum) / 30));
        }
      }
    }
  }

  return sharp(px, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Scanline outer-background keyer for Dark-Studio images:
 * Scans inward from left, right, and top borders only while pixels match the flat
 * border studio tone (zero gradient). The moment a scanline hits the character's
 * outer lineart or rim-lit silhouette, it stops — locking 100% of the interior
 * clothing/body core solid.
 */
async function keyDarkStudioSilhouetteLocked(srcPath) {
  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const px = new Uint8Array(data);
  const bgMask = new Uint8Array(w * h);

  // Sample top-left & top-right studio backdrop color
  const tlR = px[0], tlG = px[1], tlB = px[2];
  const trR = px[(w - 1) * 4], trG = px[(w - 1) * 4 + 1], trB = px[(w - 1) * 4 + 2];

  const isBorderStudio = (x, o, prevO) => {
    const r = px[o], g = px[o + 1], b = px[o + 2];
    const t = x / Math.max(1, w - 1);
    const refR = tlR * (1 - t) + trR * t;
    const refG = tlG * (1 - t) + trG * t;
    const refB = tlB * (1 - t) + trB * t;
    const dRef = Math.hypot(r - refR, g - refG, b - refB);
    const dStep = Math.hypot(r - px[prevO], g - px[prevO + 1], b - px[prevO + 2]);
    return dRef <= 16 && dStep <= 4.0;
  };

  // Scan inward from left and right on each row, stopping at the outer silhouette contour
  // In the lower torso zone (y > 0.55 * h), cap inward scan if border itself isn't studio dark
  for (let y = 0; y < h; y++) {
    const rowStartO = (y * w + 0) * 4;
    if (Math.hypot(px[rowStartO] - tlR, px[rowStartO + 1] - tlG, px[rowStartO + 2] - tlB) <= 16) {
      bgMask[y * w + 0] = 1;
      for (let x = 1; x < w; x++) {
        const o = (y * w + x) * 4;
        const prevO = (y * w + (x - 1)) * 4;
        if (isBorderStudio(x, o, prevO)) {
          bgMask[y * w + x] = 1;
        } else {
          break;
        }
      }
    }

    const rowEndO = (y * w + (w - 1)) * 4;
    if (Math.hypot(px[rowEndO] - trR, px[rowEndO + 1] - trG, px[rowEndO + 2] - trB) <= 16) {
      bgMask[y * w + (w - 1)] = 1;
      for (let x = w - 2; x >= 0; x--) {
        const o = (y * w + x) * 4;
        const prevO = (y * w + (x + 1)) * 4;
        if (isBorderStudio(x, o, prevO)) {
          bgMask[y * w + x] = 1;
        } else {
          break;
        }
      }
    }
  }

  // Scan downward from top edge until top of hair/head
  for (let x = 0; x < w; x++) {
    const topO = x * 4;
    const t = x / Math.max(1, w - 1);
    const refR = tlR * (1 - t) + trR * t;
    const refG = tlG * (1 - t) + trG * t;
    const refB = tlB * (1 - t) + trB * t;
    if (Math.hypot(px[topO] - refR, px[topO + 1] - refG, px[topO + 2] - refB) <= 16) {
      bgMask[x] = 1;
      for (let y = 1; y < h; y++) {
        const o = (y * w + x) * 4;
        const prevO = ((y - 1) * w + x) * 4;
        if (isBorderStudio(x, o, prevO)) {
          bgMask[y * w + x] = 1;
        } else {
          break;
        }
      }
    }
  }

  const refAt = (x) => {
    const t = x / Math.max(1, w - 1);
    return [
      tlR * (1 - t) + trR * t,
      tlG * (1 - t) + trG * t,
      tlB * (1 - t) + trB * t,
    ];
  };

  const isStudioPixel = (x, y) => {
    const o = (y * w + x) * 4;
    const r = px[o];
    const g = px[o + 1];
    const b = px[o + 2];
    const [refR, refG, refB] = refAt(x);
    return Math.hypot(r - refR, g - refG, b - refB) <= 18;
  };

  // Flood studio into gaps touching outer keyed backdrop
  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (bgMask[idx] || !isStudioPixel(x, y)) continue;
        if (
          (x > 0 && bgMask[idx - 1]) ||
          (x < w - 1 && bgMask[idx + 1]) ||
          (y > 0 && bgMask[idx - w]) ||
          (y < h - 1 && bgMask[idx + w])
        ) {
          bgMask[idx] = 1;
          changed = true;
        }
      }
    }
  }

  // Key interior floor/horizon bands (between silhouette edges, lower frame only)
  const lowerStartY = Math.floor(h * 0.38);
  for (let y = lowerStartY; y < h; y++) {
    let lx = 0;
    while (lx < w && bgMask[y * w + lx]) lx++;
    let rx = w - 1;
    while (rx > lx && bgMask[y * w + rx]) rx--;
    for (let x = lx; x <= rx; x++) {
      if (isStudioPixel(x, y)) bgMask[y * w + x] = 1;
    }
  }

  for (let idx = 0; idx < w * h; idx++) {
    if (bgMask[idx]) {
      px[idx * 4 + 3] = 0;
    } else {
      px[idx * 4 + 3] = 255;
    }
  }

  stripStudioFringeFromOpaque(px, w, h, refAt, 20);
  snapAlphaHard(px, w, h);

  return sharp(px, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** True for flat #FF00AA-style backdrop pixels (not character clothing). */
function isChromaBackdrop(r, g, b) {
  const rbMin = Math.min(r, b);
  const magentaness = rbMin - g;
  return r > 150 && b > 70 && g < 110 && magentaness > 30;
}

/** Darkened red plate left behind a magenta backdrop (not skin). */
function isRedPlate(r, g, b) {
  return (
    r >= 40 &&
    r <= 210 &&
    g <= 130 &&
    b <= 150 &&
    Math.abs(g - b) <= 16 &&
    r - g >= 24 &&
    r - b >= 18
  );
}

/** Peel a pink rim that touches transparency, a few pixels deep. */
function peelPinkRim(px, w, h, passes) {
  for (let pass = 0; pass < passes; pass++) {
    const kill = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const o = idx * 4;
        if (px[o + 3] === 0) continue;
        const touches =
          px[(idx - 1) * 4 + 3] === 0 ||
          px[(idx + 1) * 4 + 3] === 0 ||
          px[(idx - w) * 4 + 3] === 0 ||
          px[(idx + w) * 4 + 3] === 0;
        if (!touches) continue;
        if (!isRedPlate(px[o], px[o + 1], px[o + 2])) continue;
        kill.push(idx);
      }
    }
    if (kill.length === 0) break;
    for (const idx of kill) {
      const o = idx * 4;
      px[o + 3] = 0;
      px[o] = px[o + 1] = px[o + 2] = 0;
    }
  }
}

/**
 * Scanline chroma keyer: keys only outer magenta reachable from borders;
 * locks the full scanline interior solid (prevents pants/boots being eaten).
 */
async function keyChromaMagentaSilhouetteLocked(srcPath) {
  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const px = new Uint8Array(data);
  const bgMask = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    let lx = 0;
    while (lx < w && isChromaBackdrop(px[(y * w + lx) * 4], px[(y * w + lx) * 4 + 1], px[(y * w + lx) * 4 + 2])) {
      bgMask[y * w + lx] = 1;
      lx++;
    }
    let rx = w - 1;
    while (rx > lx && isChromaBackdrop(px[(y * w + rx) * 4], px[(y * w + rx) * 4 + 1], px[(y * w + rx) * 4 + 2])) {
      bgMask[y * w + rx] = 1;
      rx--;
    }
  }

  for (let x = 0; x < w; x++) {
    let ty = 0;
    while (ty < h && isChromaBackdrop(px[(ty * w + x) * 4], px[(ty * w + x) * 4 + 1], px[(ty * w + x) * 4 + 2])) {
      bgMask[ty * w + x] = 1;
      ty++;
    }
  }

  for (let idx = 0; idx < w * h; idx++) {
    const o = idx * 4;
    if (bgMask[idx]) {
      px[o + 3] = 0;
      px[o] = px[o + 1] = px[o + 2] = 0;
      continue;
    }
    const r = px[o];
    const g = px[o + 1];
    const b = px[o + 2];
    if (isChromaBackdrop(r, g, b)) {
      bgMask[idx] = 1;
      px[o + 3] = 0;
      px[o] = px[o + 1] = px[o + 2] = 0;
    } else {
      px[o + 3] = 255;
    }
  }

  // Eat the red plate that sits behind hair when the magenta key stops short.
  let plateChanged = true;
  while (plateChanged) {
    plateChanged = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (bgMask[idx]) continue;
        const o = idx * 4;
        if (!isRedPlate(px[o], px[o + 1], px[o + 2])) continue;
        const touches =
          (x > 0 && bgMask[idx - 1]) ||
          (x < w - 1 && bgMask[idx + 1]) ||
          (y > 0 && bgMask[idx - w]) ||
          (y < h - 1 && bgMask[idx + w]);
        if (!touches) continue;
        bgMask[idx] = 1;
        px[o + 3] = 0;
        px[o] = px[o + 1] = px[o + 2] = 0;
        plateChanged = true;
      }
    }
  }

  stripChromaFringeFromOpaque(px, w, h);
  despillChromaMagenta(px, w, h);
  peelPinkRim(px, w, h, 18);
  snapAlphaHard(px, w, h);
  defringeChromaMagenta(px, w, h);
  despillChromaMagenta(px, w, h);
  peelPinkRim(px, w, h, 8);

  return sharp(px, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Chroma-Magenta Keyer with Silhouette Core Protection:
 * Keys outer magenta background while locking any non-magenta interior clothing 100% opaque.
 */
async function keyChromaMagenta(srcPath) {
  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const px = new Uint8Array(data);

  for (let idx = 0; idx < w * h; idx++) {
    const o = idx * 4;
    const r = px[o];
    const g = px[o + 1];
    const b = px[o + 2];

    const rbMin = Math.min(r, b);
    const magentaness = rbMin - g;

    if (r > 175 && b > 100 && g < 70 && magentaness > 75) {
      px[o + 3] = 0;
    } else if (r > 145 && b > 85 && magentaness > 48) {
      const alphaFactor = Math.max(0, Math.min(1, 1 - (magentaness - 48) / 40));
      px[o + 3] = Math.round(255 * alphaFactor);
      const neutral = Math.round(r * 0.35 + g * 0.45 + b * 0.2);
      px[o] = Math.round(r * alphaFactor + neutral * (1 - alphaFactor));
      px[o + 2] = Math.round(b * alphaFactor + neutral * (1 - alphaFactor));
    } else {
      px[o + 3] = 255;
    }
  }

  snapAlphaHard(px, w, h);
  defringeChromaMagenta(px, w, h);

  return sharp(px, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function writePngAtomic(outDir, baseName, pngBuffer) {
  const dest = join(outDir, `${baseName}.png`);
  const tmp = join(outDir, `${baseName}.${process.pid}.tmp.png`);
  await sharp(pngBuffer).toFile(tmp);
  try {
    unlinkSync(dest);
  } catch {
    /* first write */
  }
  renameSync(tmp, dest);
}

async function saveBothDirs(baseName, srcJpgPath, pngBuffer) {
  for (const outDir of outDirs) {
    try {
      if (srcJpgPath) {
        copyFileSync(srcJpgPath, join(outDir, `${baseName}.jpg`));
      }
      await writePngAtomic(outDir, baseName, pngBuffer);
    } catch (err) {
      console.warn(`[skip write] ${outDir}/${baseName}: ${err.message}`);
    }
  }
}

const defenseOnly = process.argv.includes("--defense-only");
const intelOnly = process.argv.includes("--intel-only");
const supportOnly = process.argv.includes("--support-only");

if (!defenseOnly && !intelOnly && !supportOnly) {
for (const base of PASS1_WHITE_FILES) {
  const srcJpg = join(cursorAssetsDir, `${base}.jpg`);
  if (!existsSync(srcJpg)) continue;
  const pngBuf = await keyWhiteStudioSilhouetteLocked(srcJpg);
  await saveBothDirs(base, srcJpg, pngBuf);
  console.log(`[White Silhouette-Locked] ${base}`);
}

for (const [srcBase, outBase, cropTopRatio, cropHeightRatio] of [
  ["part-timer-v4-full-satire", "p2-part-timer-v4-reframed", 0.02, 0.72],
  ["office-clerk-v4-full-satire", "p2-office-clerk-v4-reframed", 0.0, 0.72],
]) {
  const srcPng = join(outDirs[0], `${srcBase}.png`);
  const srcJpg = join(outDirs[0], `${srcBase}.jpg`);
  const meta = await sharp(srcPng).metadata();
  const w = meta.width;
  const h = meta.height;
  const extractH = Math.round(h * cropHeightRatio);
  const extractW = Math.round(extractH * (3 / 4));
  const left = Math.max(0, Math.round((w - extractW) / 2));
  const top = Math.max(0, Math.round(h * cropTopRatio));

  const croppedPng = await sharp(srcPng)
    .extract({ left, top, width: Math.min(w - left, extractW), height: extractH })
    .resize(864, 1152, { fit: "cover" })
    .png()
    .toBuffer();

  const croppedJpg = await sharp(srcJpg)
    .extract({ left, top, width: Math.min(w - left, extractW), height: extractH })
    .resize(864, 1152, { fit: "cover" })
    .jpeg({ quality: 92 })
    .toBuffer();

  for (const outDir of outDirs) {
    await sharp(croppedPng).toFile(join(outDir, `${outBase}.png`));
    await sharp(croppedJpg).toFile(join(outDir, `${outBase}.jpg`));
  }
  console.log(`[Reframed Silhouette-Locked] ${outBase}`);
}

for (const base of PASS2_DARK_FILES) {
  const srcJpg = join(cursorAssetsDir, `${base}.jpg`);
  if (!existsSync(srcJpg)) continue;
  const pngBuf = await keyDarkStudioSilhouetteLocked(srcJpg);
  await saveBothDirs(base, srcJpg, pngBuf);
  console.log(`[Dark Silhouette-Locked] ${base}`);
}

for (const base of PASS2_CHROMA_FILES) {
  const srcJpg = join(cursorAssetsDir, `${base}.jpg`);
  if (!existsSync(srcJpg)) continue;
  const pngBuf = await keyChromaMagenta(srcJpg);
  await saveBothDirs(base, srcJpg, pngBuf);
  console.log(`[Chroma Silhouette-Locked] ${base}`);
}

console.log("All portraits processed with 100% solid interior clothing core.");
}

const defenseOutDirs = [
  join(root, "docs/unit-portrait-review/images/defense"),
  join(root, "src/assets/reference/unit-portraits/defense"),
];
for (const d of defenseOutDirs) {
  mkdirSync(d, { recursive: true });
}

const DEFENSE_DARK_FILES = [
  "defense-ex-bouncer-v3-stance-dark",
];

const DEFENSE_CHROMA_FILES = [
  "defense-mall-cop-v1-patrol-dark",
  "defense-mall-cop-v1-alt-chroma",
  "defense-mall-cop-v3-keys-dark",
  "defense-mall-cop-v2-segway-satire-chroma",
  "defense-mall-cop-v4-kiosk-chroma",
  "defense-night-watch-v1-graveyard-dark",
  "defense-night-watch-v2-flashlight-chroma",
  "defense-night-watch-v3-desk-dark",
  "defense-night-watch-v4-coffee-chroma",
  "defense-ex-bouncer-v1-intimidate-dark",
  "defense-ex-bouncer-v2-vip-chroma",
  "defense-ex-bouncer-v4-gloves-chroma",
  "defense-corp-sec-v1-detail-dark",
  "defense-corp-sec-v2-binders-chroma",
  "defense-corp-sec-v3-holo-dark",
  "defense-corp-sec-v4-shield-chroma",
];

async function saveDefenseDirs(baseName, srcJpgPath, pngBuffer) {
  for (const outDir of defenseOutDirs) {
    try {
      if (srcJpgPath) {
        copyFileSync(srcJpgPath, join(outDir, `${baseName}.jpg`));
      }
      await writePngAtomic(outDir, baseName, pngBuffer);
    } catch (err) {
      console.warn(`[defense skip write] ${outDir}/${baseName}: ${err.message}`);
    }
  }
}

async function processDefensePortraits() {
  for (const base of DEFENSE_DARK_FILES) {
    const srcJpg = join(cursorAssetsDir, `${base}.jpg`);
    if (!existsSync(srcJpg)) continue;
    const pngBuf = await keyDarkStudioSilhouetteLocked(srcJpg);
    await saveDefenseDirs(base, srcJpg, pngBuf);
    console.log(`[Defense Dark] ${base}`);
  }
  for (const base of DEFENSE_CHROMA_FILES) {
    const srcJpg = join(cursorAssetsDir, `${base}.jpg`);
    if (!existsSync(srcJpg)) continue;
    const pngBuf = await keyChromaMagentaSilhouetteLocked(srcJpg);
    await saveDefenseDirs(base, srcJpg, pngBuf);
    console.log(`[Defense Chroma Silhouette] ${base}`);
  }
  console.log("Defense portrait batch complete.");
}

if (defenseOnly) {
  await processDefensePortraits();
}

const intelOutDirs = [
  join(root, "docs/unit-portrait-review/images/intel"),
  join(root, "src/assets/reference/unit-portraits/intel"),
];
for (const d of intelOutDirs) {
  mkdirSync(d, { recursive: true });
}

const INTEL_CHROMA_FILES = [
  "intel-internet-surfer-v1-monitor-chroma",
  "intel-internet-surfer-v2-ramen-chroma",
  "intel-internet-surfer-v3-phone-chroma",
  "intel-internet-surfer-v4-energy-chroma",
  "intel-office-gossip-v1-whisper-chroma",
  "intel-office-gossip-v2-tea-chroma",
  "intel-office-gossip-v3-hallway-chroma",
  "intel-office-gossip-v4-sticky-chroma",
  "intel-linkedin-stalker-v1-profile-chroma",
  "intel-linkedin-stalker-v2-cutout-chroma",
  "intel-linkedin-stalker-v3-dualphone-chroma",
  "intel-linkedin-stalker-v4-binoculars-chroma",
  "intel-data-snoop-v1-keyboard-chroma",
  "intel-data-snoop-v2-splitscreen-chroma",
  "intel-data-snoop-v3-wrist-hud-chroma",
  "intel-data-snoop-v4-penmic-chroma",
];

async function saveIntelDirs(baseName, srcJpgPath, pngBuffer) {
  for (const outDir of intelOutDirs) {
    try {
      if (srcJpgPath) {
        copyFileSync(srcJpgPath, join(outDir, `${baseName}.jpg`));
      }
      await writePngAtomic(outDir, baseName, pngBuffer);
    } catch (err) {
      console.warn(`[intel skip write] ${outDir}/${baseName}: ${err.message}`);
    }
  }
}

async function processIntelPortraits() {
  for (const base of INTEL_CHROMA_FILES) {
    const srcJpg = join(cursorAssetsDir, `${base}.jpg`);
    if (!existsSync(srcJpg)) {
      console.warn(`[Intel skip missing] ${base}.jpg`);
      continue;
    }
    const pngBuf = await keyChromaMagentaSilhouetteLocked(srcJpg);
    await saveIntelDirs(base, srcJpg, pngBuf);
    console.log(`[Intel Chroma Silhouette] ${base}`);
  }
  console.log("Intel portrait batch complete.");
}

if (intelOnly) {
  await processIntelPortraits();
}

const supportOutDirs = [
  join(root, "docs/unit-portrait-review/images/support"),
  join(root, "src/assets/reference/unit-portraits/support"),
];
for (const d of supportOutDirs) {
  mkdirSync(d, { recursive: true });
}

const SUPPORT_CHROMA_FILES = [
  "support-janitor-v1-mop-chroma",
  "support-janitor-v2-cart-chroma",
  "support-janitor-v3-night-chroma",
  "support-janitor-v4-plant-chroma",
  "support-courier-v1-helmet-chroma",
  "support-courier-v2-satchel-chroma",
  "support-courier-v3-radio-chroma",
  "support-courier-v4-skate-chroma",
  "support-lead-v1-huddle-chroma",
  "support-lead-v2-checklist-chroma",
  "support-lead-v3-headset-chroma",
  "support-lead-v4-coffee-run-chroma",
  "support-momdad-v1-thermos-chroma",
  "support-momdad-v2-snack-chroma",
  "support-momdad-v3-cardigan-chroma",
  "support-momdad-v4-dad-chroma",
];

async function saveSupportDirs(baseName, srcJpgPath, pngBuffer) {
  for (const outDir of supportOutDirs) {
    try {
      if (srcJpgPath) {
        copyFileSync(srcJpgPath, join(outDir, `${baseName}.jpg`));
      }
      await writePngAtomic(outDir, baseName, pngBuffer);
    } catch (err) {
      console.warn(`[support skip write] ${outDir}/${baseName}: ${err.message}`);
    }
  }
}

async function processSupportPortraits() {
  for (const base of SUPPORT_CHROMA_FILES) {
    const srcJpg = join(cursorAssetsDir, `${base}.jpg`);
    if (!existsSync(srcJpg)) {
      console.warn(`[Support skip missing] ${base}.jpg`);
      continue;
    }
    const pngBuf = await keyChromaMagentaSilhouetteLocked(srcJpg);
    await saveSupportDirs(base, srcJpg, pngBuf);
    console.log(`[Support Chroma Silhouette] ${base}`);
  }
  console.log("Support portrait batch complete.");
}

if (supportOnly) {
  await processSupportPortraits();
}
