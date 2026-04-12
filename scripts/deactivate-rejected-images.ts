/**
 * Deactivate published images whose staging counterpart has been rejected.
 *
 * Image.filename is set to StagingImage.cloudinaryPublicId at publish time,
 * so we join on that field to find affected records.
 *
 * Usage:
 *   npx tsx scripts/deactivate-rejected-images.ts           # dry run — shows what would change
 *   npx tsx scripts/deactivate-rejected-images.ts --apply   # apply the changes
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const DRY_RUN = !process.argv.includes("--apply");

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const rejectedStaging = await prisma.stagingImage.findMany({
    where: { status: "REJECTED" },
    select: { id: true, cloudinaryPublicId: true },
  });

  if (rejectedStaging.length === 0) {
    console.log("No rejected staging images found.");
    await prisma.$disconnect();
    return;
  }

  const cloudinaryIds = rejectedStaging.map((s) => s.cloudinaryPublicId);

  const affectedImages = await prisma.image.findMany({
    where: {
      filename: { in: cloudinaryIds },
      isActive: true,
    },
    select: { id: true, filename: true },
  });

  if (affectedImages.length === 0) {
    console.log(`Found ${rejectedStaging.length} rejected staging image(s), but none have an active published image.`);
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${affectedImages.length} active image(s) to deactivate:`);
  for (const img of affectedImages) {
    console.log(`  Image ${img.id} (${img.filename})`);
  }

  if (DRY_RUN) {
    console.log("\nDry run — no changes made. Pass --apply to deactivate.");
  } else {
    const { count } = await prisma.image.updateMany({
      where: { filename: { in: cloudinaryIds }, isActive: true },
      data: { isActive: false },
    });
    console.log(`\nDeactivated ${count} image(s).`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
