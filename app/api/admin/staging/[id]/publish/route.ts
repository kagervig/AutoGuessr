import type { NextRequest } from "next/server";
import type { BodyStyle, Era, Rarity } from "../../../../../generated/prisma/client";
import { prisma } from "@/app/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

const BODY_STYLES: BodyStyle[] = [
  "coupe", "sedan", "convertible", "hatchback", "wagon",
  "suv", "truck", "van", "roadster", "targa",
];

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const staging = await prisma.stagingImage.findUnique({ where: { id } });
  if (!staging) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (staging.status === "PUBLISHED") {
    return Response.json({ error: "Already published" }, { status: 400 });
  }

  // Resolve the final values: admin fields take precedence over community-confirmed
  const make = staging.adminMake ?? staging.confirmedMake;
  const model = staging.adminModel ?? staging.confirmedModel;
  const year = staging.adminYear ?? staging.confirmedYear;

  if (!make || !model || !year) {
    return Response.json(
      { error: "make, model, and year are required to publish. Fill them in via the admin panel or wait for community confirmation." },
      { status: 422 }
    );
  }

  const trim = staging.adminTrim ?? staging.confirmedTrim ?? null;
  const rawBodyStyle = staging.adminBodyStyle ?? staging.aiBodyStyle ?? null;
  const bodyStyle: BodyStyle =
    rawBodyStyle && BODY_STYLES.includes(rawBodyStyle as BodyStyle)
      ? (rawBodyStyle as BodyStyle)
      : "sedan";

  // POST body can supply the remaining required Vehicle fields
  const body = await request.json().catch(() => ({}));
  const regionId: string | undefined = body.regionId;
  const countryOfOrigin: string | undefined = body.countryOfOrigin;
  const era: Era = body.era ?? "modern";
  const rarity: Rarity = body.rarity ?? "common";
  const categorySlugs: string[] = body.categorySlugs ?? [];
  const isHardcoreEligible: boolean = body.isHardcoreEligible ?? false;

  if (!regionId || !countryOfOrigin) {
    return Response.json(
      { error: "regionId and countryOfOrigin are required in the request body to publish." },
      { status: 422 }
    );
  }

  const region = await prisma.region.findUnique({ where: { id: regionId } });
  if (!region) {
    return Response.json({ error: `Region not found: ${regionId}` }, { status: 400 });
  }

  const categories = categorySlugs.length
    ? await prisma.category.findMany({ where: { slug: { in: categorySlugs } } })
    : [];

  // Create Vehicle + Image + ImageStats, then mark staging as published
  const vehicle = await prisma.vehicle.create({
    data: {
      make,
      model,
      year,
      trim,
      countryOfOrigin,
      regionId: region.id,
      bodyStyle,
      era,
      rarity,
    },
  });

  if (categories.length > 0) {
    await prisma.vehicleCategory.createMany({
      data: categories.map((c) => ({ vehicleId: vehicle.id, categoryId: c.id })),
    });
  }

  const image = await prisma.image.create({
    data: {
      vehicleId: vehicle.id,
      filename: staging.cloudinaryPublicId,
      sourceUrl: staging.sourceUrl,
      attribution: staging.attribution,
      isActive: true,
      isHardcoreEligible,
    },
  });

  await prisma.imageStats.create({
    data: { imageId: image.id },
  });

  await prisma.stagingImage.update({
    where: { id },
    data: { status: "PUBLISHED", reviewedAt: new Date() },
  });

  return Response.json({ vehicleId: vehicle.id, imageId: image.id });
}
