// GET handler for the admin Images tab — returns all published images with vehicle data.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.toLowerCase();
  const make = searchParams.get("make");
  const model = searchParams.get("model");
  const limit = parseInt(searchParams.get("limit") ?? "10000", 10);
  const activeOnly = searchParams.get("activeOnly") === "true";

  const images = await prisma.image.findMany({
    where: {
      ...(activeOnly && { isActive: true }),
      ...(make && { vehicle: { make: { equals: make, mode: "insensitive" } } }),
      ...(model && { vehicle: { model: { equals: model, mode: "insensitive" } } }),
      ...(search && {
        OR: [
          { vehicle: { make: { contains: search, mode: "insensitive" } } },
          { vehicle: { model: { contains: search, mode: "insensitive" } } },
          { filename: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { uploadedAt: "desc" },
    take: limit,
    include: {
      vehicle: {
        include: {
          region: true,
          categories: { include: { category: true } },
        },
      },
    },
  });

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

  return Response.json({ items });
}
