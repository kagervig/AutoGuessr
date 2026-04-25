// Seeds staging images and vehicle trivia.
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, StagingStatus } from "../app/generated/prisma/client";
import { seedTrivia } from "./seed-trivia";

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

async function restorePreviouslyDeletedImages() {
  const nonPublishedStaging = await prisma.stagingImage.findMany({
    where: { status: { not: StagingStatus.PUBLISHED } },
  });

  if (nonPublishedStaging.length === 0) return;

  console.log("Restoring previously deleted images...");

  for (const staging of nonPublishedStaging) {
    const alreadyExists = await prisma.image.findUnique({
      where: { filename: staging.cloudinaryPublicId },
    });
    if (alreadyExists) continue;

    if (!staging.adminMake || !staging.adminModel || !staging.adminYear) continue;

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        make: staging.adminMake,
        model: staging.adminModel,
        year: staging.adminYear,
      },
    });
    if (!vehicle) continue;

    const image = await prisma.image.create({
      data: {
        vehicleId: vehicle.id,
        filename: staging.cloudinaryPublicId,
        isActive: true,
        isHardcoreEligible: staging.adminIsHardcoreEligible ?? false,
        sourceUrl: staging.sourceUrl,
        attribution: staging.attribution,
        copyrightHolder: staging.adminCopyrightHolder ?? null,
        isCropped: staging.adminIsCropped ?? false,
        isLogoVisible: staging.adminIsLogoVisible ?? false,
        isModelNameVisible: staging.adminIsModelNameVisible ?? false,
        hasMultipleVehicles: staging.adminHasMultipleVehicles ?? false,
        isFaceVisible: staging.adminIsFaceVisible ?? false,
        isVehicleUnmodified: staging.adminIsVehicleUnmodified ?? true,
      },
    });
    await prisma.imageStats.create({ data: { imageId: image.id } });

    console.log(`  ✓ restored ${staging.cloudinaryPublicId}`);
  }
}

async function main() {
  const totalNonPublished = NON_PUBLISHED_STATUSES.length * IMAGES_PER_STATUS;

  await restorePreviouslyDeletedImages();

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

  console.log("Deleting non-published images from Image table...");
  const nonPublishedIds = nonPublishedImages.map((img) => img.id);
  await prisma.guess.deleteMany({
    where: { round: { imageId: { in: nonPublishedIds } } },
  });
  await prisma.round.deleteMany({ where: { imageId: { in: nonPublishedIds } } });
  await prisma.imageStats.deleteMany({ where: { imageId: { in: nonPublishedIds } } });
  await prisma.image.deleteMany({ where: { id: { in: nonPublishedIds } } });

  console.log(`\nSeeding vehicle trivia...`);
  await seedTrivia(prisma);

  console.log(`\nDone.`);
  console.log(`  ${publishedImages.length} images active as PUBLISHED`);
  console.log(
    `  ${nonPublishedIds.length} images deleted across ${NON_PUBLISHED_STATUSES.length} non-published statuses`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
