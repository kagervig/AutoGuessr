// Returns all images flagged for review, with their latest report, for the admin panel.
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";

export async function GET() {
  const images = await prisma.image.findMany({
    where: { needsReview: true },
    include: {
      vehicle: true,
      reports: { orderBy: { createdAt: "desc" } },
      stats: true,
    },
    orderBy: { uploadedAt: "desc" },
  });

  const items = images.map((image) => {
    const latestReport = image.reports[0] ?? null;
    return {
      id: image.id,
      filename: image.filename,
      isActive: image.isActive,
      needsReview: image.needsReview,
      uploadedAt: image.uploadedAt,
      imageUrl: imageUrl(image.filename, image.vehicleId, image.transformationSignature, image.cropMethod),
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
      reportCount: image.reports.length,
      latestReport: latestReport
        ? {
            certainty: latestReport.certainty,
            comment: latestReport.comment,
            createdAt: latestReport.createdAt,
            suggestedMake: latestReport.suggestedMake,
            suggestedModel: latestReport.suggestedModel,
            suggestedYear: latestReport.suggestedYear,
            suggestedTrim: latestReport.suggestedTrim,
            suggestedCountryOfOrigin: latestReport.suggestedCountryOfOrigin,
            suggestedBodyStyle: latestReport.suggestedBodyStyle,
            suggestedEra: latestReport.suggestedEra,
            suggestedRarity: latestReport.suggestedRarity,
          }
        : null,
    };
  });

  return Response.json(items);
}
