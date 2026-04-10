/**
 * Seeds a handful of StagingImage records for local development and testing.
 *
 * Pulls N published Image records and creates a StagingImage for each one
 * pointing to the same Cloudinary asset. This gives the duplicate detector
 * real staging ↔ published duplicates to find.
 *
 * Usage:
 *   npx tsx scripts/seed-staging.ts [--count N]   (default: 5)
 */

import dotenv from "dotenv";
dotenv.config({ override: true });
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const args = process.argv.slice(2);
const countIndex = args.indexOf("--count");
const count = countIndex !== -1 ? parseInt(args[countIndex + 1], 10) : 5;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const published = await prisma.image.findMany({
    take: count,
    select: { filename: true, vehicle: { select: { make: true, model: true, year: true } } },
    orderBy: { uploadedAt: "asc" },
  });

  if (published.length === 0) {
    console.log("No published images found — run the seed script first.");
    return;
  }

  // Skip any that already exist as staging images
  const existing = await prisma.stagingImage.findMany({
    where: { cloudinaryPublicId: { in: published.map((i) => i.filename) } },
    select: { cloudinaryPublicId: true },
  });
  const existingIds = new Set(existing.map((e) => e.cloudinaryPublicId));

  const toCreate = published.filter((i) => !existingIds.has(i.filename));
  if (toCreate.length === 0) {
    console.log("All selected images are already in staging.");
    return;
  }

  await prisma.stagingImage.createMany({
    data: toCreate.map((img) => ({
      cloudinaryPublicId: img.filename,
      filename: img.filename.split("/").pop() ?? img.filename,
      adminMake: img.vehicle.make,
      adminModel: img.vehicle.model,
      adminYear: img.vehicle.year,
      status: "PENDING_REVIEW",
    })),
  });

  console.log(`Created ${toCreate.length} staging image(s):`);
  for (const img of toCreate) {
    console.log(`  ${img.vehicle.year} ${img.vehicle.make} ${img.vehicle.model} — ${img.filename}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => pool.end());
