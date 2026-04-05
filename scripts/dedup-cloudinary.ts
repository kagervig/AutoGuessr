/**
 * Delete Cloudinary resources that have no corresponding StagingImage DB record.
 *
 * This cleans up orphaned uploads — e.g. from a re-run after switching databases.
 * The DB is treated as authoritative: anything Cloudinary has that the DB doesn't
 * know about gets deleted.
 *
 * Usage:
 *   npx tsx scripts/dedup-cloudinary.ts [--prefix autoguessr/staging/] [--dry-run]
 *
 * Flags:
 *   --prefix <folder>   Cloudinary folder prefix to scan (default: "autoguessr/staging/")
 *   --dry-run           Print what would be deleted without actually deleting
 *
 * Required env:
 *   DATABASE_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const args = process.argv.slice(2);
const prefixIndex = args.indexOf("--prefix");
const prefix = prefixIndex !== -1 ? args[prefixIndex + 1] : "autoguessr/staging/";
const dryRun = args.includes("--dry-run");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface CloudinaryResource {
  public_id: string;
}

async function listAllResources(prefix: string): Promise<CloudinaryResource[]> {
  const results: CloudinaryResource[] = [];
  let nextCursor: string | undefined;

  do {
    const response = await cloudinary.api.resources({
      type: "upload",
      prefix,
      max_results: 500,
      next_cursor: nextCursor,
    });
    results.push(...(response.resources as CloudinaryResource[]));
    nextCursor = response.next_cursor;
  } while (nextCursor);

  return results;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log(`Scanning Cloudinary prefix: "${prefix}"`);
  const resources = await listAllResources(prefix);
  console.log(`Found ${resources.length} Cloudinary resource(s).`);

  const knownIds = new Set(
    (await prisma.stagingImage.findMany({ select: { cloudinaryPublicId: true } }))
      .map((r) => r.cloudinaryPublicId)
  );
  console.log(`Found ${knownIds.size} DB record(s).`);

  const orphans = resources.filter((r) => !knownIds.has(r.public_id));
  console.log(`Found ${orphans.length} orphaned resource(s) to delete.`);

  if (orphans.length === 0) {
    console.log("Nothing to do.");
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  if (dryRun) {
    for (const r of orphans) {
      console.log(`  [dry-run] Would delete: ${r.public_id}`);
    }
  } else {
    // Cloudinary bulk delete accepts up to 100 public_ids at a time
    const BATCH = 100;
    let deleted = 0;
    for (let i = 0; i < orphans.length; i += BATCH) {
      const batch = orphans.slice(i, i + BATCH).map((r) => r.public_id);
      await cloudinary.api.delete_resources(batch, { resource_type: "image" });
      deleted += batch.length;
      console.log(`  Deleted ${deleted}/${orphans.length}...`);
    }
    console.log(`\nDone. Deleted ${deleted} orphaned resource(s).`);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
