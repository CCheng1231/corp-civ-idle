/**
 * Pass 2 Portrait Processor:
 * 1. White-studio images (Pass 1 keepers & banked):
 *    - Border flood-fill + enclosed interior white-pocket clearing (between arms, hair loops, straps)
 *    - 2px color-unmixing white-halo defringer
 *    - Also generates 1/2-to-3/4 waist/hip reframed versions of Part-timer V4 and Office Clerk V4.
 * 2. Dark-studio images (`p2-*-dark`):
 *    - Samples corner dark studio tone (#121820) and keys outer + enclosed dark pockets with soft ramp;
 *      zero white pixels exist anywhere in the source, so zero white halo is possible.
 * 3. Chroma-magenta images (`p2-*-chroma`):
 *    - Global chroma key on magenta/pink backdrop (clears all interior hair/arm gaps automatically)
 *    - Magenta spill suppression on edge pixels so edges look natural on dark UI and checkerboard.
 */
import sharp from "sharp";
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
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

function isWhiteBgCandidate(r, g, b) {
  const minC = Math.min(r, g, b);
  const maxC = Math.max(r, g, b);
  const sat = maxC - minC;
  // Strict pure studio white only so shaded off-white shirts (#E8EDF5) are never eaten
  return minC >= 244 && sat <= 8;
}

function isPureInteriorWhite(r, g, b) {
  return r >= 246 && g >= 246 && b >= 246 && Math.max(r, g, b) - Math.min(r, g, b) <= 6;
}

/**
 * Upgraded Pass 1 white-backdrop keyer:
 * - Flood fills from border
 * - Finds enclosed interior pure-white holes (e.g. between arm & torso or inside lanyard/hair loops)
 *   that are surrounded by dark outline pixels, and clears them too
 * - Unmixes white from 2px boundary halo so no bright fringe remains on dark UI.
 */
async function keyWhiteStudioUpgraded(srcPath) {
  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const px = new Uint8Array(data);
  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const pushIfBg = (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    const o = idx * 4;
    if (isWhiteBgCandidate(px[o], px[o + 1], px[o + 2])) {
      visited[idx] = 1;
      queue[tail++] = idx;
    }
  };

  for (let x = 0; x < w; x++) {
    pushIfBg(x, 0);
  }
  for (let y = 0; y < h; y++) {
    pushIfBg(0, y);
    pushIfBg(w - 1, y);
  }

  while (head < tail) {
    const idx = queue[head++];
    const x = idx % w;
    const y = (idx - x) / w;
    pushIfBg(x - 1, y);
    pushIfBg(x + 1, y);
    pushIfBg(x, y - 1);
    pushIfBg(x, y + 1);
  }

  // Clear all enclosed studio-white pockets (hair loops, arm-to-waist gaps, cup/strap gaps).
  // Studio backdrop pockets have >= 42% pure flat #FCFCFC-#FFFFFF pixels, whereas shaded white
  // shirts/collars/eyes have <= 18% pure flat 252+ pixels.
  const compVisited = new Uint8Array(w * h);
  const compMembers = new Int32Array(w * h);

  for (let startIdx = 0; startIdx < w * h; startIdx++) {
    if (visited[startIdx] || compVisited[startIdx]) continue;
    const so = startIdx * 4;
    const sr = px[so], sg = px[so + 1], sb = px[so + 2];
    if (Math.min(sr, sg, sb) < 236 || Math.max(sr, sg, sb) - Math.min(sr, sg, sb) > 10) {
      continue;
    }

    let cHead = 0;
    let cTail = 0;
    let pure252 = 0;
    compVisited[startIdx] = 1;
    compMembers[cTail++] = startIdx;

    while (cHead < cTail) {
      const cur = compMembers[cHead++];
      const cx = cur % w;
      const cy = (cur - cx) / w;
      const co = cur * 4;
      const cr = px[co], cg = px[co + 1], cb = px[co + 2];
      if (
        cr >= 252 &&
        cg >= 252 &&
        cb >= 252 &&
        Math.max(cr, cg, cb) - Math.min(cr, cg, cb) <= 4
      ) {
        pure252++;
      }

      const neighbors = [
        [cx - 1, cy],
        [cx + 1, cy],
        [cx, cy - 1],
        [cx, cy + 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const nIdx = ny * w + nx;
        if (compVisited[nIdx] || visited[nIdx]) continue;
        const no = nIdx * 4;
        const nr = px[no], ng = px[no + 1], nb = px[no + 2];
        if (
          Math.min(nr, ng, nb) >= 230 &&
          Math.max(nr, ng, nb) - Math.min(nr, ng, nb) <= 14
        ) {
          compVisited[nIdx] = 1;
          compMembers[cTail++] = nIdx;
        }
      }
    }

    const pureRatio = cTail > 0 ? pure252 / cTail : 0;
    if (cTail >= 50 && pureRatio >= 0.65) {
      for (let i = 0; i < cTail; i++) {
        visited[compMembers[i]] = 1;
      }
    }
  }

  for (let idx = 0; idx < w * h; idx++) {
    if (visited[idx]) {
      px[idx * 4 + 3] = 0;
    }
  }

  // 2-pass white-halo defringing & color unmixing on edge pixels
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const o = idx * 4;
        if (px[o + 3] === 0) continue;

        const nTransparent =
          (px[(idx - 1) * 4 + 3] < 32 ? 1 : 0) +
          (px[(idx + 1) * 4 + 3] < 32 ? 1 : 0) +
          (px[(idx - w) * 4 + 3] < 32 ? 1 : 0) +
          (px[(idx + w) * 4 + 3] < 32 ? 1 : 0);

        if (nTransparent > 0) {
          const r = px[o];
          const g = px[o + 1];
          const b = px[o + 2];
          const lum = (r + g + b) / 3;
          const sat = Math.max(r, g, b) - Math.min(r, g, b);
          if (lum > 185 && sat < 35) {
            // Unmix white halo
            const alpha = Math.max(0, Math.min(1, (248 - lum) / 68));
            px[o + 3] = Math.round(px[o + 3] * alpha);
            // Pull RGB slightly darker toward lineart so semi-transparent edge doesn't glow white
            px[o] = Math.round(r * 0.65);
            px[o + 1] = Math.round(g * 0.65);
            px[o + 2] = Math.round(b * 0.65);
          }
        }
      }
    }
  }

  return sharp(px, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Pass 2 Dark-Studio Keyer:
 * Uses row-adaptive border reference + tight local neighbor step (<= 4.5 RGB delta)
 * so vertical studio gradients key out 100% cleanly down to the bottom corners
 * without ever crossing character outlines into dark clothing.
 */
async function keyDarkStudio(srcPath) {
  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const px = new Uint8Array(data);

  // Per-row left/right border reference to handle vertical studio gradients
  const leftBg = new Uint8Array(h * 3);
  const rightBg = new Uint8Array(h * 3);
  for (let y = 0; y < h; y++) {
    const lo = (y * w + 0) * 4;
    const ro = (y * w + (w - 1)) * 4;
    leftBg[y * 3] = px[lo];
    leftBg[y * 3 + 1] = px[lo + 1];
    leftBg[y * 3 + 2] = px[lo + 2];
    rightBg[y * 3] = px[ro];
    rightBg[y * 3 + 1] = px[ro + 1];
    rightBg[y * 3 + 2] = px[ro + 2];
  }

  const rowBgDist = (x, y, r, g, b) => {
    const t = x / Math.max(1, w - 1);
    const refR = leftBg[y * 3] * (1 - t) + rightBg[y * 3] * t;
    const refG = leftBg[y * 3 + 1] * (1 - t) + rightBg[y * 3 + 1] * t;
    const refB = leftBg[y * 3 + 2] * (1 - t) + rightBg[y * 3 + 2] * t;
    return Math.hypot(r - refR, g - refG, b - refB);
  };

  const stepDist = (o1, o2) =>
    Math.hypot(px[o1] - px[o2], px[o1 + 1] - px[o2 + 1], px[o1 + 2] - px[o2 + 2]);

  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const trySeed = (x, y) => {
    const idx = y * w + x;
    if (visited[idx]) return;
    const o = idx * 4;
    const lum = (px[o] + px[o + 1] + px[o + 2]) / 3;
    if (lum <= 58 && rowBgDist(x, y, px[o], px[o + 1], px[o + 2]) <= 26) {
      visited[idx] = 1;
      queue[tail++] = idx;
    }
  };

  // Seed from top, left, and right borders (never bottom torso edge)
  for (let x = 0; x < w; x++) {
    trySeed(x, 0);
  }
  for (let y = 0; y < h; y++) {
    trySeed(0, y);
    trySeed(w - 1, y);
  }

  while (head < tail) {
    const idx = queue[head++];
    const x = idx % w;
    const y = (idx - x) / w;
    const curO = idx * 4;

    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const nIdx = ny * w + nx;
      if (visited[nIdx]) continue;
      const nO = nIdx * 4;
      const lum = (px[nO] + px[nO + 1] + px[nO + 2]) / 3;
      if (
        lum <= 58 &&
        rowBgDist(nx, ny, px[nO], px[nO + 1], px[nO + 2]) <= 26 &&
        stepDist(curO, nO) <= 9.5
      ) {
        visited[nIdx] = 1;
        queue[tail++] = nIdx;
      }
    }
  }

  // Also clear enclosed flat dark-studio pockets (e.g. between hand-on-hip and waist)
  const compVisited = new Uint8Array(w * h);
  const compMembers = new Int32Array(w * h);
  for (let startIdx = 0; startIdx < w * h; startIdx++) {
    if (visited[startIdx] || compVisited[startIdx]) continue;
    const sy = Math.floor(startIdx / w);
    const sx = startIdx - sy * w;
    if (sy > h * 0.88) continue;
    const so = startIdx * 4;
    if (rowBgDist(sx, sy, px[so], px[so + 1], px[so + 2]) > 8) continue;

    let cHead = 0;
    let cTail = 0;
    let touchesBottom = false;
    compVisited[startIdx] = 1;
    compMembers[cTail++] = startIdx;

    while (cHead < cTail) {
      const cur = compMembers[cHead++];
      const cx = cur % w;
      const cy = (cur - cx) / w;
      if (cy >= h - 4) touchesBottom = true;
      const curO = cur * 4;
      for (const [nx, ny] of [
        [cx - 1, cy],
        [cx + 1, cy],
        [cx, cy - 1],
        [cx, cy + 1],
      ]) {
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const nIdx = ny * w + nx;
        if (compVisited[nIdx] || visited[nIdx]) continue;
        const nO = nIdx * 4;
        if (
          rowBgDist(nx, ny, px[nO], px[nO + 1], px[nO + 2]) <= 10 &&
          stepDist(curO, nO) <= 3.5
        ) {
          compVisited[nIdx] = 1;
          compMembers[cTail++] = nIdx;
        }
      }
    }

    if (!touchesBottom && cTail >= 120 && cTail <= 25000) {
      for (let i = 0; i < cTail; i++) {
        visited[compMembers[i]] = 1;
      }
    }
  }

  for (let idx = 0; idx < w * h; idx++) {
    if (visited[idx]) {
      px[idx * 4 + 3] = 0;
    }
  }

  // Soft 1px anti-alias feather on outer silhouette edge only
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (visited[idx]) continue;
      const bgNeighbors =
        visited[idx - 1] +
        visited[idx + 1] +
        visited[idx - w] +
        visited[idx + w];
      if (bgNeighbors > 0) {
        const o = idx * 4;
        const d = rowBgDist(x, y, px[o], px[o + 1], px[o + 2]);
        if (d < 20) {
          px[o + 3] = Math.round(255 * Math.max(0.3, (d - 8) / 12));
        }
      }
    }
  }

  return sharp(px, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Pass 2 Chroma-Magenta Keyer + Spill Suppressor:
 * Globally keys magenta pixels (including interior arm/hair gaps) and suppresses magenta spill on edges.
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

    // Magenta dominance: high R and B, very low G
    const rbMin = Math.min(r, b);
    const magentaness = rbMin - g;

    if (r > 165 && b > 95 && g < 75 && magentaness > 65) {
      px[o + 3] = 0;
    } else if (r > 130 && b > 80 && magentaness > 35) {
      // Soft edge ramp + spill suppression
      const alphaFactor = Math.max(0, Math.min(1, 1 - (magentaness - 35) / 45));
      px[o + 3] = Math.round(255 * alphaFactor);
      // Desaturate magenta spill on semi-transparent boundary pixels
      const neutral = Math.round((r * 0.35 + g * 0.45 + b * 0.2));
      px[o] = Math.round(r * alphaFactor + neutral * (1 - alphaFactor));
      px[o + 2] = Math.round(b * alphaFactor + neutral * (1 - alphaFactor));
    }
  }

  // Clean 1px residual magenta fringe adjacent to transparent pixels
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const o = idx * 4;
      if (px[o + 3] === 0) continue;
      const hasTransNeighbor =
        px[(idx - 1) * 4 + 3] === 0 ||
        px[(idx + 1) * 4 + 3] === 0 ||
        px[(idx - w) * 4 + 3] === 0 ||
        px[(idx + w) * 4 + 3] === 0;
      if (hasTransNeighbor) {
        const r = px[o];
        const g = px[o + 1];
        const b = px[o + 2];
        if (r > g + 35 && b > g + 25) {
          const clampRB = Math.min(255, g + 22);
          px[o] = Math.min(r, clampRB);
          px[o + 2] = Math.min(b, clampRB);
          px[o + 3] = Math.round(px[o + 3] * 0.65);
        }
      }
    }
  }

  return sharp(px, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function saveBothDirs(baseName, srcJpgPath, pngBuffer) {
  for (const outDir of outDirs) {
    if (srcJpgPath) {
      copyFileSync(srcJpgPath, join(outDir, `${baseName}.jpg`));
    }
    await sharp(pngBuffer).toFile(join(outDir, `${baseName}.png`));
  }
}

// 1. Re-process all Pass 1 white-studio portraits with interior hole clearing + defringing
for (const base of PASS1_WHITE_FILES) {
  const srcJpg = join(cursorAssetsDir, `${base}.jpg`);
  if (!existsSync(srcJpg)) continue;
  const pngBuf = await keyWhiteStudioUpgraded(srcJpg);
  await saveBothDirs(base, srcJpg, pngBuf);
  console.log(`[Pass 1 Upgraded Alpha] ${base}`);
}

// 1b. Create 1/2-to-3/4 waist/hip reframed versions of Part-timer V4 and Office Clerk V4
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
  console.log(`[Pass 2 1/2-3/4 Reframed + Clean Alpha] ${outBase}`);
}

// 2. Process Pass 2 Dark-Studio images
for (const base of PASS2_DARK_FILES) {
  const srcJpg = join(cursorAssetsDir, `${base}.jpg`);
  if (!existsSync(srcJpg)) continue;
  const pngBuf = await keyDarkStudio(srcJpg);
  await saveBothDirs(base, srcJpg, pngBuf);
  console.log(`[Pass 2 Dark-Studio Keyed] ${base}`);
}

// 3. Process Pass 2 Chroma-Magenta images
for (const base of PASS2_CHROMA_FILES) {
  const srcJpg = join(cursorAssetsDir, `${base}.jpg`);
  if (!existsSync(srcJpg)) continue;
  const pngBuf = await keyChromaMagenta(srcJpg);
  await saveBothDirs(base, srcJpg, pngBuf);
  console.log(`[Pass 2 Chroma-Magenta Keyed] ${base}`);
}

console.log("Pass 2 portrait processing complete.");
