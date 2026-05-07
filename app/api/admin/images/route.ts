// GET handler for the admin Images tab — returns all published images with vehicle data.
import type { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const make = searchParams.get("make");
    const model = searchParams.get("model");
    const isActive = searchParams.get("isActive");

    const where: Prisma.ImageWhereInput = {};
    if (make || model) {
      const vehicleFilter: Prisma.VehicleWhereInput = {};
      if (make) vehicleFilter.make = make;
      if (model) vehicleFilter.model = model;
      where.vehicle = vehicleFilter;
    }
    if (isActive !== null && isActive !== undefined && isActive !== "ALL") {
      where.isActive = isActive === "true";
    }

    const [images, totalCount] = await Promise.all([
      prisma.image.findMany({
        where,
        orderBy: { uploadedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          vehicle: {
            include: {
              region: true,
              categories: { include: { category: true } },
            },
          },
        },
      }),
      prisma.image.count({ where }),
    ]);

    const items = images.map((img) => ({
      id: img.id,
      imageUrl: imageUrl(img.filename, img.vehicle.id),
      filename: img.filename,
      isActive: img.isActive,
      isHardcoreEligible: img.isHardcoreEligible,
      copyrightHolder: img.copyrightHolder,
      isCropped: img.isCropped,
      isLogoVisible: img.isLogoVisible,
      isModelNameVisible: img.isModelNameVisible,
      hasMultipleVehicles: img.hasMultipleVehicles,
      isFaceVisible: img.isFaceVisible,
      isVehicleUnmodified: img.isVehicleUnmodified,
      uploadedAt: img.uploadedAt,
      vehicle: {
        id: img.vehicle.id,
        make: img.vehicle.make,
        model: img.vehicle.model,
        year: img.vehicle.year,
        trim: img.vehicle.trim,
        bodyStyle: img.vehicle.bodyStyle,
        era: img.vehicle.era,
        rarity: img.vehicle.rarity,
        countryOfOrigin: img.vehicle.countryOfOrigin,
        regionSlug: img.vehicle.region.slug,
        categories: img.vehicle.categories.map((vc) => vc.category.slug),
      },
    }));

    return Response.json({
      items,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/images GET]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}
