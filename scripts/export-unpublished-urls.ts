// Exports Cloudinary URLs for the N most recent unpublished staging images.
//
// "Unpublished" means status is PENDING_REVIEW, COMMUNITY_REVIEW, or READY.
// REJECTED and PUBLISHED images are excluded.
//
// Usage:
//   npx tsx scripts/export-unpublished-urls.ts [--limit N] [--output FILE]
//
// Flags:
//   --limit N      Number of images to export (default: 100)
//   --output FILE  Write URLs to FILE instead of stdout
//
// Required env:
//   DATABASE_URL, CLOUDINARY_CLOUD_NAME

import "dotenv/config";
import fs from "fs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, StagingStatus } from "../app/generated/prisma/client";

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

const limitArg = args.indexOf("--limit");
const limit = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : 100;

const outputArg = args.indexOf("--output");
const outputFile = outputArg !== -1 ? args[outputArg + 1] : null;

// ── Active statuses ───────────────────────────────────────────────────────────

const ACTIVE_STATUSES: StagingStatus[] = [
  StagingStatus.PENDING_REVIEW,
  StagingStatus.COMMUNITY_REVIEW,
  StagingStatus.READY,
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    console.error("Error: CLOUDINARY_CLOUD_NAME is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const db = new PrismaClient({ adapter });

  try {
    const images = await db.stagingImage.findMany({
      where: { status: { in: ACTIVE_STATUSES } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { cloudinaryPublicId: true },
    });

    if (images.length === 0) {
      console.error("No unpublished images found.");
      return;
    }

    const urls = images
      .map((img) => `https://res.cloudinary.com/${cloudName}/image/upload/${img.cloudinaryPublicId}`)
      .join("\n");

    if (outputFile) {
      fs.writeFileSync(outputFile, urls + "\n", "utf-8");
      console.error(`Wrote ${images.length} URLs to ${outputFile}`);
    } else {
      console.log(urls);
    }
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
