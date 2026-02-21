import fs from "node:fs";
import path from "node:path";
import { imageSize } from "image-size";
import exifParser from "exif-parser";
import sharp from "sharp";

const rel = process.argv[2];
if (!rel) {
  console.error("Usage: node scripts/diag-image.mjs public/images/....jpg");
  process.exit(1);
}

const abs = path.resolve(process.cwd(), rel);
const buf = fs.readFileSync(abs);

// 1) image-size (usually raw pixel dims, ignoring EXIF orientation)
let is;
try {
  is = imageSize(buf);
} catch (e) {
  is = { error: String(e) };
}

// 2) EXIF orientation (raw tag)
let orientation = null;
try {
  const exif = exifParser.create(buf).parse();
  orientation = exif?.tags?.Orientation ?? null;
} catch (e) {
  orientation = `EXIF read error: ${e}`;
}

// 3) sharp metadata (width/height + orientation as sharp sees it)
let sm;
try {
  sm = await sharp(buf).metadata();
} catch (e) {
  sm = { error: String(e) };
}

// 4) “displayed dims” if EXIF indicates 90/270 rotation
const rawW = is?.width ?? sm?.width ?? null;
const rawH = is?.height ?? sm?.height ?? null;
const needsSwap = [5, 6, 7, 8].includes(Number(orientation));
const displayW = (rawW && rawH && needsSwap) ? rawH : rawW;
const displayH = (rawW && rawH && needsSwap) ? rawW : rawH;

console.log("FILE:", rel);
console.log("image-size:", is);
console.log("exif Orientation:", orientation);
console.log("sharp metadata:", {
  width: sm?.width, height: sm?.height, orientation: sm?.orientation, format: sm?.format
});
console.log("computed:", {
  rawW, rawH,
  needsSwap,
  displayW, displayH
});