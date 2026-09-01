// Quick R2 connection sanity check. Reads credentials from .env (never prints them).
// Run:  node --env-file=.env scripts/r2-check.mjs
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;

const missing = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"]
  .filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing in .env: ${missing.join(", ")}`);
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

try {
  const res = await client.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, MaxKeys: 5 }));
  console.log(`✅ Authenticated and reached bucket "${R2_BUCKET}".`);
  console.log(`   Objects currently in bucket: ${res.KeyCount ?? 0}`);
} catch (e) {
  console.error(`❌ Connection failed: ${e.name} — ${e.message}`);
  process.exit(1);
}
