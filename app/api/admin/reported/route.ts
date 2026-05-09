// Returns all images that have at least one report, with their full report history, for the admin panel.
// PATCH actions: dismiss, reactivate, deactivate, apply (write report suggestions onto vehicle).
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";

export async function GET() {
  const reports = await prisma.imageReport.findMany({
    orderBy: { createdAt: "desc" },
  });

  const imageIds = [...new Set(reports.map((r) => r.imageId))];

  const images = await prisma.image.findMany({
    where: { id: { in: imageIds } },
    include: {
      vehicle: true,
      stats: true,
    },
  });

  const items = images.map((image) => {
    const imageReports = reports.filter((r) => r.imageId === image.id);
    return {
      id: image.id,
      filename: image.filename,
      isActive: image.isActive,
      uploadedAt: image.uploadedAt,
      imageUrl: imageUrl(
        image.filename,
        image.vehicleId,
        image.transformationSignature,
        image.cropMethod,
      ),
      vehicle: {
        make: image.vehicle.make,
        model: image.vehicle.model,
        year: image.vehicle.year,
        trim: image.vehicle.trim,
        bodyStyle: image.vehicle.bodyStyle,
        era: image.vehicle.era,
        rarity: image.vehicle.rarity,
        countryOfOrigin: image.vehicle.countryOfOrigin,
      },
      vehicleId: image.vehicleId,
      reportCount: imageReports.length,
      reports: imageReports.map((r) => ({
        id: r.id,
        certainty: r.certainty,
        comment: r.comment,
        createdAt: r.createdAt,
        suggestedMake: r.suggestedMake,
        suggestedModel: r.suggestedModel,
        suggestedYear: r.suggestedYear,
        suggestedTrim: r.suggestedTrim,
        suggestedCountryOfOrigin: r.suggestedCountryOfOrigin,
        suggestedBodyStyle: r.suggestedBodyStyle,
        suggestedEra: r.suggestedEra,
        suggestedRarity: r.suggestedRarity,
      })),
    };
  });

  return Response.json(items);
}
