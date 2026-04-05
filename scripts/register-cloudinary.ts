/**
 * Register existing Cloudinary images as StagingImage records.
 *
 * Use this when images were uploaded directly to Cloudinary (not via
 * stage-images.ts) and you want to bring them into the tagging/review
 * workflow. Already-registered images are skipped.
 *
 * Usage:
 *   npx tsx scripts/register-cloudinary.ts --prefix cars/ [--limit N] [--dry-run]
 *
 * Flags:
 *   --prefix <folder>   Cloudinary folder prefix to list (e.g. "cars/", "uploads/")
 *   --limit N           Register only N images (useful for testing)
 *   --dry-run           Print what would be created without writing to DB
 *
 * Required env:
 *   DATABASE_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

import "dotenv/config";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

const prefixIndex = args.indexOf("--prefix");
const prefix = prefixIndex !== -1 ? args[prefixIndex + 1] : "";

const limitIndex = args.indexOf("--limit");
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : undefined;

const dryRun = args.includes("--dry-run");

// ── Cloudinary setup ──────────────────────────────────────────────────────────

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface CloudinaryResource {
  public_id: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
  created_at: string;
}

async function listAllResources(prefix: string, limit?: number): Promise<CloudinaryResource[]> {
  const results: CloudinaryResource[] = [];
  let nextCursor: string | undefined;

  do {
    const batchSize = limit ? Math.min(500, limit - results.length) : 500;
    const response = await cloudinary.api.resources({
      type: "upload",
      prefix,
      max_results: batchSize,
      next_cursor: nextCursor,
    });

    results.push(...(response.resources as CloudinaryResource[]));
    nextCursor = response.next_cursor;

    if (limit && results.length >= limit) break;
  } while (nextCursor);

  return limit ? results.slice(0, limit) : results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log(`Listing Cloudinary resources${prefix ? ` under prefix "${prefix}"` : " (all)"}...`);
  const resources = await listAllResources(prefix, limit);

  if (resources.length === 0) {
    console.log("No resources found.");
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  console.log(`Found ${resources.length} resource(s).`);
  if (dryRun) console.log("Dry run — no DB writes.");

  // Fetch existing public IDs to skip already-registered images
  const existingIds = new Set(
    (await prisma.stagingImage.findMany({ select: { cloudinaryPublicId: true } }))
      .map((r) => r.cloudinaryPublicId)
  );

  let created = 0;
  let skipped = 0;

  for (const resource of resources) {
    if (existingIds.has(resource.public_id)) {
      console.log(`  SKIP  ${resource.public_id}`);
      skipped++;
      continue;
    }

    const filename = path.basename(resource.public_id) + "." + resource.format;
    console.log(`  ${dryRun ? "[dry-run] WOULD CREATE" : "CREATE"} ${resource.public_id}  (${filename})`);

    if (!dryRun) {
      await prisma.stagingImage.create({
        data: {
          cloudinaryPublicId: resource.public_id,
          filename,
        },
      });
    }

    created++;
  }

  await prisma.$disconnect();
  await pool.end();

  console.log(`\nDone.`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
