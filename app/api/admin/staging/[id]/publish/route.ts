import type { NextRequest } from "next/server";
import type { BodyStyle, Era, Rarity } from "../../../../../generated/prisma/client";
import { prisma } from "@/app/lib/prisma";
import { BODY_STYLES, ERAS, RARITIES } from "@/app/lib/constants";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const staging = await prisma.stagingImage.findUnique({ where: { id } });
  if (!staging) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (staging.status === "PUBLISHED") {
    return Response.json({ error: "Already published" }, { status: 400 });
  }

  // Admin fields take precedence over community-confirmed
  const make = staging.adminMake ?? staging.confirmedMake;
  const model = staging.adminModel ?? staging.confirmedModel;
  const year = staging.adminYear ?? staging.confirmedYear;

  if (!make || !model || !year) {
    return Response.json(
      { error: "Make, model, and year are required. Fill them in and save before publishing." },
      { status: 422 }
    );
  }

  const regionSlug = staging.adminRegionSlug;
  const countryOfOrigin = staging.adminCountryOfOrigin;

  if (!regionSlug || !countryOfOrigin) {
    return Response.json(
      { error: "Region and country of origin are required. Fill them in and save before publishing." },
      { status: 422 }
    );
  }

  const region = await prisma.region.findUnique({ where: { slug: regionSlug } });
  if (!region) {
    return Response.json({ error: `Region not found: "${regionSlug}"` }, { status: 400 });
  }

  const trim = staging.adminTrim ?? staging.confirmedTrim ?? null;

  const rawBodyStyle = staging.adminBodyStyle ?? staging.aiBodyStyle ?? null;
  const bodyStyle: BodyStyle =
    rawBodyStyle && BODY_STYLES.includes(rawBodyStyle as BodyStyle)
      ? (rawBodyStyle as BodyStyle)
      : "sedan";

  const rawEra = staging.adminEra ?? null;
  const era: Era = rawEra && ERAS.includes(rawEra as Era) ? (rawEra as Era) : "modern";

  const rawRarity = staging.adminRarity ?? null;
  const rarity: Rarity = rawRarity && RARITIES.includes(rawRarity as Rarity) ? (rawRarity as Rarity) : "common";

  const categorySlugs = staging.adminCategories;
  const isHardcoreEligible = staging.adminIsHardcoreEligible ?? false;

  const categories = categorySlugs.length
    ? await prisma.category.findMany({ where: { slug: { in: categorySlugs } } })
    : [];

  try {
    const { vehicle, image } = await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.create({
        data: { make, model, year, trim, countryOfOrigin, regionId: region.id, bodyStyle, era, rarity },
      });

      if (categories.length > 0) {
        await tx.vehicleCategory.createMany({
          data: categories.map((c) => ({ vehicleId: vehicle.id, categoryId: c.id })),
        });
      }

      const image = await tx.image.create({
        data: {
          vehicleId: vehicle.id,
          filename: staging.cloudinaryPublicId,
          sourceUrl: staging.sourceUrl,
          attribution: staging.attribution,
          copyrightHolder: staging.adminCopyrightHolder ?? null,
          isCropped: staging.adminIsCropped ?? false,
          isLogoVisible: staging.adminIsLogoVisible ?? false,
          isModelNameVisible: staging.adminIsModelNameVisible ?? false,
          hasMultipleVehicles: staging.adminHasMultipleVehicles ?? false,
          isFaceVisible: staging.adminIsFaceVisible ?? false,
          isVehicleUnmodified: staging.adminIsVehicleUnmodified ?? true,
          isActive: true,
          isHardcoreEligible,
        },
      });

      await tx.imageStats.create({ data: { imageId: image.id } });

      await tx.stagingImage.update({
        where: { id },
        data: { status: "PUBLISHED", reviewedAt: new Date() },
      });

      return { vehicle, image };
    });

    await prisma.knownMake.upsert({
      where: { name: make },
      create: { name: make },
      update: {},
    });
    await prisma.knownModel.upsert({
      where: { make_name: { make, name: model } },
      create: { make, name: model },
      update: {},
    });

    return Response.json({ vehicleId: vehicle.id, imageId: image.id });
  } catch (err: unknown) {
    console.error("[publish]", err);
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return Response.json(
        { error: "An image with this Cloudinary ID already exists. It may have been published already." },
        { status: 409 }
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
