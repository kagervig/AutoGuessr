// PUT handler for the admin Images tab — updates image flags and vehicle data in a transaction.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const {
    isActive,
    isHardcoreEligible,
    copyrightHolder,
    isCropped,
    isLogoVisible,
    isModelNameVisible,
    hasMultipleVehicles,
    isFaceVisible,
    isVehicleUnmodified,
    // Vehicle fields
    make,
    model,
    year,
    trim,
    bodyStyle,
    era,
    rarity,
    countryOfOrigin,
    regionSlug,
    categories,
  } = body;

  const image = await prisma.image.findUnique({
    where: { id },
    select: { vehicleId: true, filename: true },
  });

  if (!image) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  let regionId: string | undefined;
  if (regionSlug !== undefined) {
    const region = await prisma.region.findUnique({ where: { slug: regionSlug } });
    if (!region) {
      return Response.json({ error: `Region not found: "${regionSlug}"` }, { status: 400 });
    }
    regionId = region.id;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedImage = await tx.image.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(isHardcoreEligible !== undefined && { isHardcoreEligible }),
        ...(copyrightHolder !== undefined && { copyrightHolder: copyrightHolder || null }),
        ...(isCropped !== undefined && { isCropped }),
        ...(isLogoVisible !== undefined && { isLogoVisible }),
        ...(isModelNameVisible !== undefined && { isModelNameVisible }),
        ...(hasMultipleVehicles !== undefined && { hasMultipleVehicles }),
        ...(isFaceVisible !== undefined && { isFaceVisible }),
        ...(isVehicleUnmodified !== undefined && { isVehicleUnmodified }),
      },
      include: {
        vehicle: {
          include: {
            region: true,
            categories: { include: { category: true } },
          },
        },
      },
    });

    const vehicleData = {
      ...(make !== undefined && { make }),
      ...(model !== undefined && { model }),
      ...(year !== undefined && { year: year ? parseInt(year, 10) : undefined }),
      ...(trim !== undefined && { trim: trim || null }),
      ...(bodyStyle !== undefined && { bodyStyle }),
      ...(era !== undefined && { era }),
      ...(rarity !== undefined && { rarity }),
      ...(countryOfOrigin !== undefined && { countryOfOrigin }),
      ...(regionId !== undefined && { regionId }),
    };

    if (Object.keys(vehicleData).length > 0) {
      await tx.vehicle.update({
        where: { id: image.vehicleId },
        data: vehicleData,
      });
    }

    if (Array.isArray(categories)) {
      await tx.vehicleCategory.deleteMany({ where: { vehicleId: image.vehicleId } });
      if (categories.length > 0) {
        const categoryRecords = await tx.category.findMany({
          where: { slug: { in: categories } },
        });
        await tx.vehicleCategory.createMany({
          data: categoryRecords.map((c) => ({ vehicleId: image.vehicleId, categoryId: c.id })),
        });
      }
    }

    // Mirror the staging panel's reverse behaviour: deactivating a published image rejects its staging record.
    if (isActive === false) {
      await tx.stagingImage.updateMany({
        where: { cloudinaryPublicId: image.filename, status: "PUBLISHED" },
        data: { status: "REJECTED" },
      });
    }

    return updatedImage;
  });

  // Re-fetch vehicle after transaction to reflect any changes
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: image.vehicleId },
    include: {
      region: true,
      categories: { include: { category: true } },
    },
  });

  return Response.json({
    id: updated.id,
    isActive: updated.isActive,
    isHardcoreEligible: updated.isHardcoreEligible,
    copyrightHolder: updated.copyrightHolder,
    isCropped: updated.isCropped,
    isLogoVisible: updated.isLogoVisible,
    isModelNameVisible: updated.isModelNameVisible,
    hasMultipleVehicles: updated.hasMultipleVehicles,
    isFaceVisible: updated.isFaceVisible,
    isVehicleUnmodified: updated.isVehicleUnmodified,
    vehicle: vehicle ? {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      trim: vehicle.trim,
      bodyStyle: vehicle.bodyStyle,
      era: vehicle.era,
      rarity: vehicle.rarity,
      countryOfOrigin: vehicle.countryOfOrigin,
      regionSlug: vehicle.region.slug,
      categories: vehicle.categories.map((vc) => vc.category.slug),
    } : null,
  });
}
