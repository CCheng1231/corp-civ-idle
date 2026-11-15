/**
 * Softens square-tile seams for repeatable map ground textures.
 * 1) Edge cross-blend (left↔right, top↔bottom) over `margin` px
 * 2) Half-tile offset + center cross feather (classic seamless pass)
 *
 * Usage: node scripts/blend-map-tile-seam.mjs --in <path> [--out <path>] [--margin 64]
 */
import sharp from "sharp";
import {
  copyFileSync,
  existsSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) return undefined;
  return process.argv[i + 1];
}

const input = argValue("--in");
const output = argValue("--out") ?? input;
const margin = Number(argValue("--margin") ?? 72);

if (!input || !existsSync(input)) {
  console.error("Usage: node scripts/blend-map-tile-seam.mjs --in <image> [--out path] [--margin px]");
  process.exit(1);
}

function smoothstep(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function edgeCrossBlend(buf, w, h, ch, band) {
  const out = Buffer.from(buf);
  const avg = (i, j) => (buf[i] + buf[j]) / 2;

  for (let y = 0; y < h; y += 1) {
    for (let m = 0; m < band; m += 1) {
      const t = smoothstep(1 - m / band);
      const xL = m;
      const xR = w - 1 - m;
      if (xL >= xR) break;
      const iL = (y * w + xL) * ch;
      const iR = (y * w + xR) * ch;
      for (let c = 0; c < ch; c += 1) {
        const mid = avg(iL + c, iR + c);
        out[iL + c] = Math.round(buf[iL + c] * (1 - t) + mid * t);
        out[iR + c] = Math.round(buf[iR + c] * (1 - t) + mid * t);
      }
    }
  }

  for (let x = 0; x < w; x += 1) {
    for (let m = 0; m < band; m += 1) {
      const t = smoothstep(1 - m / band);
      const yT = m;
      const yB = h - 1 - m;
      if (yT >= yB) break;
      const iT = (yT * w + x) * ch;
      const iB = (yB * w + x) * ch;
      for (let c = 0; c < ch; c += 1) {
        const mid = avg(out[iT + c], out[iB + c]);
        out[iT + c] = Math.round(out[iT + c] * (1 - t) + mid * t);
        out[iB + c] = Math.round(out[iB + c] * (1 - t) + mid * t);
      }
    }
  }
  return out;
}

function offsetWithCrossFeather(buf, w, h, ch, band) {
  const ox = Math.floor(w / 2);
  const oy = Math.floor(h / 2);
  const out = Buffer.alloc(buf.length);

  const cx0 = Math.floor(w / 2 - band / 2);
  const cx1 = Math.ceil(w / 2 + band / 2);
  const cy0 = Math.floor(h / 2 - band / 2);
  const cy1 = Math.ceil(h / 2 + band / 2);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const sx = (x + ox) % w;
      const sy = (y + oy) % h;
      const si = (sy * w + sx) * ch;
      const oi = (y * w + x) * ch;

      let wt = 0;
      if (x >= cx0 && x <= cx1) {
        const d = Math.abs(x - w / 2) / (band / 2);
        wt = Math.max(wt, smoothstep(1 - Math.min(1, d)));
      }
      if (y >= cy0 && y <= cy1) {
        const d = Math.abs(y - h / 2) / (band / 2);
        wt = Math.max(wt, smoothstep(1 - Math.min(1, d)));
      }

      if (wt <= 0) {
        for (let c = 0; c < ch; c += 1) out[oi + c] = buf[si + c];
        continue;
      }

      const mirrorX = (w - 1 - x + ox) % w;
      const mirrorY = (h - 1 - y + oy) % h;
      const mi = (mirrorY * w + mirrorX) * ch;

      for (let c = 0; c < ch; c += 1) {
        const a = buf[si + c];
        const b = buf[mi + c];
        out[oi + c] = Math.round(a * (1 - wt * 0.55) + b * (wt * 0.55));
      }
    }
  }
  return out;
}

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const w = info.width;
const h = info.height;
const ch = info.channels;
let px = Buffer.from(data);

px = edgeCrossBlend(px, w, h, ch, margin);
px = offsetWithCrossFeather(px, w, h, ch, Math.max(32, Math.floor(margin * 0.85)));

const tmp = `${output}.blend-tmp.jpg`;
if (output === input) {
  const backup = input.replace(/(\.[^.]+)$/, "-pre-seam$1");
  if (!existsSync(backup)) {
    copyFileSync(input, backup);
    console.log("backup:", backup);
  }
}

await sharp(px, { raw: { width: w, height: h, channels: ch } })
  .jpeg({ quality: 92, mozjpeg: true })
  .toFile(tmp);

if (existsSync(output)) unlinkSync(output);
renameSync(tmp, output);

console.log("wrote", output, w, "x", h, "margin", margin);