// Seeds the StagingImage table from the Image table. All images get PUBLISHED status
// except for a random sample assigned to each of the other statuses, which are deactivated
// in the Image table to simulate the pre-publish pipeline state.
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, StagingStatus } from "../app/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const NON_PUBLISHED_STATUSES: StagingStatus[] = [
  StagingStatus.PENDING_REVIEW,
  StagingStatus.COMMUNITY_REVIEW,
  StagingStatus.READY,
  StagingStatus.REJECTED,
];
const IMAGES_PER_STATUS = 4;

type ImageRow = {
  id: string;
  filename: string;
  make: string;
  model: string;
  year: number;
  trim: string | null;
  regionSlug: string;
  countryOfOrigin: string;
  bodyStyle: string;
  era: string;
  rarity: string;
};

async function main() {
  const totalNonPublished = NON_PUBLISHED_STATUSES.length * IMAGES_PER_STATUS;

  console.log("Restoring previously deactivated images...");
  await prisma.image.updateMany({
    where: { isActive: false },
    data: { isActive: true },
  });

  const allImages = await prisma.$queryRaw<ImageRow[]>`
    SELECT
      i.id,
      i.filename,
      v.make,
      v.model,
      v.year,
      v.trim,
      v."countryOfOrigin",
      v."bodyStyle",
      v.era,
      v.rarity,
      r.slug AS "regionSlug"
    FROM "Image" i
    JOIN "Vehicle" v ON v.id = i."vehicleId"
    JOIN "Region" r ON r.id = v."regionId"
    ORDER BY RANDOM()
  `;

  if (allImages.length < totalNonPublished) {
    throw new Error(
      `Need at least ${totalNonPublished} images but only found ${allImages.length} in the database`
    );
  }

  // First slice gets distributed across non-published statuses; the rest stay published.
  const nonPublishedImages = allImages.slice(0, totalNonPublished);
  const publishedImages = allImages.slice(totalNonPublished);

  console.log("Clearing existing staging data...");
  await prisma.communityVote.deleteMany();
  await prisma.communityIdentification.deleteMany();
  await prisma.stagingImage.deleteMany();

  console.log("Seeding staging images...");

  for (let i = 0; i < NON_PUBLISHED_STATUSES.length; i++) {
    const status = NON_PUBLISHED_STATUSES[i];
    const batch = nonPublishedImages.slice(
      i * IMAGES_PER_STATUS,
      (i + 1) * IMAGES_PER_STATUS
    );
    for (const image of batch) {
      await prisma.stagingImage.create({
        data: {
          cloudinaryPublicId: image.filename,
          filename: image.filename,
          status,
          adminMake: image.make,
          adminModel: image.model,
          adminYear: image.year,
          adminTrim: image.trim,
          adminRegionSlug: image.regionSlug,
          adminCountryOfOrigin: image.countryOfOrigin,
          adminBodyStyle: image.bodyStyle,
          adminEra: image.era,
          adminRarity: image.rarity,
        },
      });
      console.log(`  ✓ ${status} — ${image.filename}`);
    }
  }

  for (const image of publishedImages) {
    await prisma.stagingImage.create({
      data: {
        cloudinaryPublicId: image.filename,
        filename: image.filename,
        status: StagingStatus.PUBLISHED,
        adminMake: image.make,
        adminModel: image.model,
        adminYear: image.year,
        adminTrim: image.trim,
        adminRegionSlug: image.regionSlug,
        adminCountryOfOrigin: image.countryOfOrigin,
        adminBodyStyle: image.bodyStyle,
        adminEra: image.era,
        adminRarity: image.rarity,
      },
    });
  }
  console.log(`  ✓ PUBLISHED — ${publishedImages.length} images`);

  console.log("Deactivating non-published images...");
  const nonPublishedIds = nonPublishedImages.map((img) => img.id);
  await prisma.image.updateMany({
    where: { id: { in: nonPublishedIds } },
    data: { isActive: false },
  });

  console.log(`\nDone.`);
  console.log(`  ${publishedImages.length} images active as PUBLISHED`);
  console.log(
    `  ${nonPublishedIds.length} images deactivated across ${NON_PUBLISHED_STATUSES.length} non-published statuses`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
