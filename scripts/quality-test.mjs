// Phase 0 quality test for the R2 migration.
// Generates display-sized versions of ONE photo at several JPEG qualities so we
// can compare them fullscreen on a 4K monitor against the original, and pick the
// lowest quality with no visible detail loss.
//
// Usage:  node scripts/quality-test.mjs [path/to/source.jpg]
// Default source: a high-detail Yosemite DSLR shot.
// Output: ~/quality-test/   (open in Windows Explorer to view on the 4K monitor)

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const DEFAULT_SRC = "public/images/parks/yosemite/DSC00134.JPG";
const LONG_EDGE = 3840;          // 4K width — fills a 3840x2160 screen at native detail
const QUALITIES = [82, 85, 90];  // the candidates to compare

const srcRel = process.argv[2] || DEFAULT_SRC;
const srcAbs = path.resolve(srcRel);
const outDir = path.join(os.homedir(), "quality-test");
fs.mkdirSync(outDir, { recursive: true });

const base = path.parse(srcAbs).name;
const mb = (bytes) => (bytes / 1048576).toFixed(2) + " MB";

const origBytes = fs.statSync(srcAbs).size;
const origMeta = await sharp(srcAbs).metadata();
console.log(`\nSource: ${srcRel}`);
console.log(`  ${origMeta.width} x ${origMeta.height}   ${mb(origBytes)}\n`);

// Copy the original in for easy side-by-side reference.
const origOut = path.join(outDir, `${base}-ORIGINAL.jpg`);
fs.copyFileSync(srcAbs, origOut);
console.log(`Wrote ${path.basename(origOut).padEnd(28)} ${mb(origBytes).padStart(8)}   (untouched original)`);

// Generate each quality candidate at 3840px long edge.
for (const q of QUALITIES) {
  const outPath = path.join(outDir, `${base}-q${q}.jpg`);
  const buf = await sharp(srcAbs)
    .rotate()                                  // apply EXIF orientation, then drop the tag
    .resize({ width: LONG_EDGE, height: LONG_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: q, mozjpeg: true })       // mozjpeg = better quality per byte
    .toBuffer();
  fs.writeFileSync(outPath, buf);
  const meta = await sharp(buf).metadata();
  const pct = ((buf.length / origBytes) * 100).toFixed(0);
  console.log(
    `Wrote ${path.basename(outPath).padEnd(28)} ${mb(buf.length).padStart(8)}   ` +
    `${meta.width}x${meta.height}   (${pct}% of original size)`
  );
}

console.log(`\nDone. Open this folder in Windows and view each fullscreen on the 4K monitor:`);
console.log(`  \\\\wsl.localhost\\Ubuntu${outDir.replace(/\//g, "\\")}\n`);
