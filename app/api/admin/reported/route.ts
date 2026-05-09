// Returns all images flagged for review, with their full report history, for the admin panel.
// PATCH actions: dismiss, reactivate, deactivate, apply (write report suggestions onto vehicle).
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";
import type { BodyStyle, Era, Rarity } from "@/app/generated/prisma/client";

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

  const items = images.map((image) => ({
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
    vehicleId: image.vehicleId,
    reportCount: image.reports.length,
    reports: image.reports.map((r) => ({
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
  }));

  return Response.json(items);
}
