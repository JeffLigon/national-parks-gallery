// national-parks/src/lib/imageMeta.js
import fs from "node:fs";
import path from "node:path";
import { imageSize } from "image-size";
import exifr from "exifr";

// Cache results during dev so we don't re-read the same images constantly
const cache = new Map();

/**
 * Given a path to a file under /public, returns { width, height }
 * corrected for EXIF Orientation (fixes portrait stretch in PhotoSwipe).
 *
 * Example: "/images/parks/yosemite/gallery/IMG_3279.JPG"
 */
export async function getPublicImageSize(publicRelativePath) {
  if (cache.has(publicRelativePath)) return cache.get(publicRelativePath);

  const publicDir = path.join(process.cwd(), "public");
  const absPath = path.join(publicDir, publicRelativePath.replace(/^\//, ""));
  const buf = fs.readFileSync(absPath);

  const base = imageSize(buf);
  if (!base?.width || !base?.height) {
    throw new Error(`Could not read size: ${publicRelativePath}`);
  }

  // EXIF orientation values 5–8 imply rotated display orientation
  let orientation = 1;
  try {
    const exif = await exifr.parse(buf, { pick: ["Orientation"] });
    if (exif?.Orientation) orientation = exif.Orientation;
  } catch {
    // ignore missing/invalid EXIF
  }

  const shouldSwap = [5, 6, 7, 8].includes(orientation);
  const result = shouldSwap
    ? { width: base.height, height: base.width }
    : { width: base.width, height: base.height };

  cache.set(publicRelativePath, result);
  return result;
}