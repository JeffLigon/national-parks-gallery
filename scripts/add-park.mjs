// add-park.mjs — process one park's photos for the R2-backed gallery.
//
// For every image in  ~/projects/national-parks-gallery-photos/<park>/  it:
//   1. generates a display image (3840px long edge, q90 mozjpeg) + a thumbnail (800px, q80)
//   2. reads the display dimensions (for PhotoSwipe) and the EXIF date taken (for sorting)
//   3. uploads both sizes to R2 under  parks/<park>/  and  parks/<park>/thumbs/
//   4. writes the committed manifest  src/data/photos/<park>.json  (sorted by date taken)
//
// A file named  hero.jpg  in the folder is uploaded as the park hero (display size).
// HEIC files are NOT handled here — convert them first with scripts/convert-heic.mjs.
//
// Usage:  npm run add-park -- <park>
//    e.g. npm run add-park -- hot-springs
// (runs with `node --env-file=.env`, so R2 credentials load from .env)

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import exifr from "exifr";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ---- config ----
const DISPLAY_LONG_EDGE = 3840;
const DISPLAY_QUALITY = 90;
const THUMB_LONG_EDGE = 800;
const THUMB_QUALITY = 80;
const IMAGE_RE = /\.(jpe?g|png|webp)$/i;

// ---- args & env ----
const park = process.argv[2];
if (!park) {
  console.error("Usage: npm run add-park -- <park>   (e.g. hot-springs)");
  process.exit(1);
}

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL } = process.env;
const missingEnv = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE_URL"]
  .filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.error(`Missing in .env: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const stagingDir = path.join(os.homedir(), "projects", "national-parks-gallery-photos", park);
if (!fs.existsSync(stagingDir)) {
  console.error(`Staging folder not found: ${stagingDir}`);
  console.error(`Create it and copy this park's photos in, then re-run.`);
  process.exit(1);
}

const heicPresent = fs.readdirSync(stagingDir).some((n) => /\.heic$/i.test(n));
if (heicPresent) {
  console.error(`\n⚠️  HEIC files found in ${stagingDir}`);
  console.error(`Convert them first:  node scripts/convert-heic.mjs "${stagingDir}"`);
  console.error(`then re-run this script.\n`);
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const publicUrl = (key) => `${R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;

async function upload(key, body) {
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: "image/jpeg",
  }));
  return publicUrl(key);
}

// Resize to a long-edge box, return { buffer, width, height }.
async function resizeJpeg(srcPath, longEdge, quality) {
  const { data, info } = await sharp(srcPath)
    .rotate()                                     // bake in EXIF orientation
    .resize({ width: longEdge, height: longEdge, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height };
}

async function readDateTaken(srcPath) {
  try {
    const exif = await exifr.parse(srcPath, { pick: ["DateTimeOriginal"] });
    const d = exif?.DateTimeOriginal;
    if (d instanceof Date && !isNaN(d)) return d.toISOString();
    if (typeof d === "string") {
      const iso = d.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
      const parsed = new Date(iso);
      if (!isNaN(parsed)) return parsed.toISOString();
    }
  } catch { /* no/invalid EXIF */ }
  return null;
}

// ---- gather files ----
const allImages = fs.readdirSync(stagingDir).filter((n) => IMAGE_RE.test(n) && !n.startsWith("."));
const heroFile = allImages.find((n) => /^hero\.(jpe?g|png|webp)$/i.test(n)) || null;
const galleryFiles = allImages.filter((n) => n !== heroFile);

if (galleryFiles.length === 0) {
  console.error(`No gallery images found in ${stagingDir}`);
  process.exit(1);
}

console.log(`\nProcessing "${park}" — ${galleryFiles.length} photo(s)${heroFile ? " + hero" : ""}`);
console.log(`Staging: ${stagingDir}\n`);

// ---- process gallery photos ----
const photos = [];
let i = 0;
for (const filename of galleryFiles) {
  i++;
  const srcPath = path.join(stagingDir, filename);
  const base = path.parse(filename).name;          // e.g. "IMG_4307"
  const outName = `${base}.jpg`;

  const [display, thumb, dateTaken] = await Promise.all([
    resizeJpeg(srcPath, DISPLAY_LONG_EDGE, DISPLAY_QUALITY),
    resizeJpeg(srcPath, THUMB_LONG_EDGE, THUMB_QUALITY),
    readDateTaken(srcPath),
  ]);

  const displayUrl = await upload(`parks/${park}/${outName}`, display.buffer);
  const thumbUrl = await upload(`parks/${park}/thumbs/${outName}`, thumb.buffer);

  photos.push({
    filename: outName,
    display: displayUrl,
    thumb: thumbUrl,
    width: display.width,
    height: display.height,
    dateTaken,
  });

  const kb = (display.buffer.length / 1024).toFixed(0);
  console.log(`  [${String(i).padStart(2)}/${galleryFiles.length}] ${filename} → ${display.width}x${display.height}, ${kb} KB${dateTaken ? "" : "  (no EXIF date)"}`);
}

// sort by date taken ascending; undated photos go last (stable by name)
photos.sort((a, b) => {
  if (a.dateTaken && b.dateTaken) return a.dateTaken.localeCompare(b.dateTaken);
  if (!a.dateTaken && !b.dateTaken) return a.filename.localeCompare(b.filename);
  return a.dateTaken ? -1 : 1;
});

// ---- hero ----
let heroUrl = null;
if (heroFile) {
  const hero = await resizeJpeg(path.join(stagingDir, heroFile), DISPLAY_LONG_EDGE, DISPLAY_QUALITY);
  heroUrl = await upload(`parks/${park}/hero.jpg`, hero.buffer);
  console.log(`  hero: ${heroFile} → ${hero.width}x${hero.height}`);
}

// ---- write manifest ----
const manifest = {
  park,
  generatedAt: new Date().toISOString(),
  hero: heroUrl,
  photos,
};

const outDir = path.join(process.cwd(), "src", "data", "photos");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${park}.json`);
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + "\n");

console.log(`\n✅ Uploaded ${photos.length} photo(s)${heroUrl ? " + hero" : ""} to R2.`);
console.log(`✅ Wrote manifest: src/data/photos/${park}.json\n`);
