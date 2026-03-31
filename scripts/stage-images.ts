/**
 * Stage image ingestion script.
 *
 * Usage:
 *   npx tsx scripts/stage-images.ts --folder ./my-cars [--dry-run]
 *
 * Uploads every image in the given folder to Cloudinary under the
 * autoguessr/staging/ prefix, then creates a StagingImage record for
 * each one. Skips files that already have a StagingImage record.
 *
 * AI tagging is stubbed — aiMake/aiModel/aiYear are left null until
 * Gemini integration is added.
 *
 * Required environment variables (or .env file):
 *   DATABASE_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { createReadStream } from "fs";
import { v2 as cloudinary } from "cloudinary";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const folderIndex = args.indexOf("--folder");
const folderPath = folderIndex !== -1 ? args[folderIndex + 1] : null;
const dryRun = args.includes("--dry-run");

if (!folderPath) {
  console.error("Usage: npx tsx scripts/stage-images.ts --folder <path> [--dry-run]");
  process.exit(1);
}

const resolvedFolder = path.resolve(folderPath);
if (!fs.existsSync(resolvedFolder) || !fs.statSync(resolvedFolder).isDirectory()) {
  console.error(`Not a directory: ${resolvedFolder}`);
  process.exit(1);
}

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

// ── Cloudinary setup ──────────────────────────────────────────────────────────

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadToStaging(filePath: string, publicId: string): Promise<number> {
  const originalBytes = fs.statSync(filePath).size;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: "image",
        format: "webp",
        quality: "auto",
        transformation: [{ width: 1200, crop: "limit" }],
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("No result from Cloudinary"));
        } else {
          const savings = Math.round((1 - result.bytes / originalBytes) * 100);
          console.log(
            `  Uploaded: ${publicId} | ${(originalBytes / 1024).toFixed(1)}KB → ${(result.bytes / 1024).toFixed(1)}KB (${savings}% smaller)`
          );
          resolve(result.bytes);
        }
      }
    );
    createReadStream(filePath).pipe(stream);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const imageFiles = fs
    .readdirSync(resolvedFolder)
    .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .sort();

  if (imageFiles.length === 0) {
    console.log("No image files found in folder.");
    return;
  }

  console.log(`Found ${imageFiles.length} image(s) in ${resolvedFolder}`);
  if (dryRun) console.log("Dry run — no changes will be written.");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (const filename of imageFiles) {
    const filePath = path.join(resolvedFolder, filename);
    const stem = path.basename(filename, path.extname(filename));
    // Use a timestamp-based suffix to avoid collisions across ingestion runs
    const publicId = `autoguessr/staging/${stem}_${Date.now()}`;

    console.log(`\nProcessing: ${filename}`);

    // Check if already staged (by original filename in the staging folder)
    const existing = await prisma.stagingImage.findFirst({
      where: { filename },
    });
    if (existing) {
      console.log(`  Already staged — skipping`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  [dry-run] Would upload to ${publicId}`);
      continue;
    }

    try {
      await uploadToStaging(filePath, publicId);
    } catch (err) {
      console.error(`  Upload failed:`, err);
      errors++;
      continue;
    }

    await prisma.stagingImage.create({
      data: {
        cloudinaryPublicId: publicId,
        filename,
        // AI tagging stubbed — fields left null until Gemini is integrated
      },
    });

    uploaded++;
  }

  await prisma.$disconnect();
  await pool.end();

  console.log(`\nDone.`);
  console.log(`  Uploaded: ${uploaded}`);
  console.log(`  Skipped:  ${skipped}`);
  if (errors > 0) console.warn(`  Errors:   ${errors}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
