import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import sharp from "sharp";

const targetDir = process.argv[2];

if (!targetDir) {
  console.error("Usage: node scripts/convert-heic.mjs <directory>");
  console.error("Example: node scripts/convert-heic.mjs public/images/parks/guadalupe");
  process.exit(1);
}

const absDir = path.resolve(targetDir);

if (!fs.existsSync(absDir)) {
  console.error(`Directory not found: ${absDir}`);
  process.exit(1);
}

const heicFiles = fs
  .readdirSync(absDir)
  .filter((name) => /\.heic$/i.test(name));

if (heicFiles.length === 0) {
  console.log("No HEIC files found.");
  process.exit(0);
}

console.log(`Found ${heicFiles.length} HEIC file(s). Converting...`);

for (const filename of heicFiles) {
  const inputPath = path.join(absDir, filename);
  const outputPath = path.join(absDir, filename.replace(/\.heic$/i, ".jpg"));

  const beforeFiles = new Set(fs.readdirSync(absDir));

  try {
    execSync(`heif-convert -q 90 "${inputPath}" "${outputPath}"`, { stdio: "pipe" });

    // Delete auxiliary files heif-convert created (depth maps, HDR variants, etc.)
    for (const f of fs.readdirSync(absDir)) {
      if (!beforeFiles.has(f) && f !== path.basename(outputPath)) {
        fs.unlinkSync(path.join(absDir, f));
      }
    }

    // heif-convert rotates pixels correctly but leaves a stale Orientation tag — reset it
    const tempPath = outputPath + ".tmp.jpg";
    await sharp(outputPath).withMetadata({ orientation: 1 }).jpeg({ quality: 90 }).toFile(tempPath);
    fs.renameSync(tempPath, outputPath);

    fs.unlinkSync(inputPath);
    console.log(`  ✓ ${filename} → ${path.basename(outputPath)}`);
  } catch (err) {
    console.error(`  ✗ ${filename}: ${err.stderr?.toString().trim() ?? err.message}`);
  }
}

console.log("Done.");
