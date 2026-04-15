// GET handler for the admin Images tab — returns all published images with vehicle data.
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";

export async function GET() {
  const images = await prisma.image.findMany({
    orderBy: { uploadedAt: "desc" },
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
