// Fills missing fields on pending staging images using two passes:
// 1. Make-origin lookup → region, country, era (from year)
// 2. Published vehicle lookup → categories, bodyStyle, era, rarity, region, country (fallback)

import { prisma } from "@/app/lib/prisma";
import { lookupMakeOrigin } from "@/scripts/lib/make-origins";
import { eraFromYear } from "@/app/lib/constants";

export async function POST() {
  // Pass 1: fill region/country/era from make origin lookup
  const originCandidates = await prisma.stagingImage.findMany({
    where: {
      status: { notIn: ["PUBLISHED", "REJECTED"] },
      OR: [
        { adminRegionSlug: null },
        { adminCountryOfOrigin: null },
      ],
    },
    select: {
      id: true,
      aiMake: true,
      adminMake: true,
      aiYear: true,
      adminYear: true,
      adminEra: true,
      adminRegionSlug: true,
      adminCountryOfOrigin: true,
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const img of originCandidates) {
    const make = img.adminMake ?? img.aiMake;
    if (!make) { skipped++; continue; }

    const origin = lookupMakeOrigin(make);
    if (!origin) { skipped++; continue; }

    const year = img.adminYear ?? img.aiYear;
    const era = !img.adminEra && year ? eraFromYear(year) : undefined;

    await prisma.stagingImage.update({
      where: { id: img.id },
      data: {
        adminRegionSlug: img.adminRegionSlug ?? origin.regionSlug,
        adminCountryOfOrigin: img.adminCountryOfOrigin ?? origin.countryOfOrigin,
        ...(era ? { adminEra: era } : {}),
      },
    });
    updated++;
  }

  // Pass 2: copy vehicle-derived fields from a published vehicle with matching make/model/year.
  // Covers: categories, bodyStyle, era, rarity, and region/country as a fallback for unknown makes.
  // adminCategories is filtered in JS — the Prisma pg adapter does not support isEmpty on scalar lists.
  const vehicleCandidates = await prisma.stagingImage.findMany({
    where: {
      status: { notIn: ["PUBLISHED", "REJECTED"] },
      OR: [
        { adminMake: { not: null } },
        { aiMake: { not: null } },
      ],
    },
    select: {
      id: true,
      adminMake: true,
      aiMake: true,
      adminModel: true,
      aiModel: true,
      adminYear: true,
      aiYear: true,
      adminCategories: true,
      adminBodyStyle: true,
      adminEra: true,
      adminRarity: true,
      adminRegionSlug: true,
      adminCountryOfOrigin: true,
    },
  });

  const needsVehicleLookup = vehicleCandidates.filter((img) =>
    img.adminCategories.length === 0 ||
    !img.adminBodyStyle ||
    !img.adminEra ||
    !img.adminRarity ||
    !img.adminRegionSlug ||
    !img.adminCountryOfOrigin
  );

  let vehicleUpdated = 0;

  for (const img of needsVehicleLookup) {
    const make = img.adminMake ?? img.aiMake;
    const model = img.adminModel ?? img.aiModel;
    const year = img.adminYear ?? img.aiYear;
    if (!make || !model || !year) continue;

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        make: { equals: make, mode: "insensitive" },
        model: { equals: model, mode: "insensitive" },
        year,
      },
      select: {
        bodyStyle: true,
        era: true,
        rarity: true,
        countryOfOrigin: true,
        region: { select: { slug: true } },
        categories: { select: { category: { select: { slug: true } } } },
      },
    });

    if (!vehicle) continue;

    const data: Record<string, unknown> = {};
    if (img.adminCategories.length === 0 && vehicle.categories.length > 0)
      data.adminCategories = vehicle.categories.map((vc) => vc.category.slug);
    if (!img.adminBodyStyle && vehicle.bodyStyle) data.adminBodyStyle = vehicle.bodyStyle;
    if (!img.adminEra && vehicle.era) data.adminEra = vehicle.era;
    if (!img.adminRarity && vehicle.rarity) data.adminRarity = vehicle.rarity;
    if (!img.adminRegionSlug && vehicle.region?.slug) data.adminRegionSlug = vehicle.region.slug;
    if (!img.adminCountryOfOrigin && vehicle.countryOfOrigin) data.adminCountryOfOrigin = vehicle.countryOfOrigin;

    if (Object.keys(data).length === 0) continue;

    await prisma.stagingImage.update({ where: { id: img.id }, data });
    vehicleUpdated++;
  }

  return Response.json({ updated, skipped, vehicleUpdated });
}
