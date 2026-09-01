// Upload/replace a single hero image on R2 (resized to display size).
// Usage:  node --env-file=.env scripts/upload-hero.mjs <localPath> <r2Key>
//   e.g.  node --env-file=.env scripts/upload-hero.mjs ~/projects/national-parks-gallery-photos/hero-main.jpg hero-main.jpg
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const [src, key] = process.argv.slice(2);
if (!src || !key) {
  console.error("Usage: node --env-file=.env scripts/upload-hero.mjs <localPath> <r2Key>");
  process.exit(1);
}

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL } = process.env;
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const { data, info } = await sharp(src)
  .rotate()
  .resize({ width: 3840, height: 3840, fit: "inside", withoutEnlargement: true })
  .jpeg({ quality: 90, mozjpeg: true })
  .toBuffer({ resolveWithObject: true });

await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: data, ContentType: "image/jpeg" }));
console.log(`✅ ${key} → ${info.width}x${info.height}, ${(data.length / 1024).toFixed(0)} KB`);
console.log(`   ${R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`);
