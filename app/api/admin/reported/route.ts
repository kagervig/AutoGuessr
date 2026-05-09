// Returns all images that have at least one report, with their full report history, for the admin panel.
// PATCH actions: dismiss, reactivate, deactivate, apply (write report suggestions onto vehicle).
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";
import type { BodyStyle, Era, Rarity } from "@/app/generated/prisma/client";

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

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, imageId, reportId } = body as {
    action?: string;
    imageId?: string;
    reportId?: string;
  };

  if (!imageId) return Response.json({ error: "imageId is required" }, { status: 400 });

  if (action === "dismiss") {
    await prisma.imageReport.deleteMany({ where: { imageId } });
    return Response.json({ ok: true });
  }

  if (action === "reactivate") {
    await prisma.image.update({ where: { id: imageId }, data: { isActive: true } });
    return Response.json({ ok: true });
  }

  if (action === "deactivate") {
    await prisma.image.update({ where: { id: imageId }, data: { isActive: false } });
    return Response.json({ ok: true });
  }

  if (action === "apply") {
    if (!reportId) return Response.json({ error: "reportId is required for apply" }, { status: 400 });

    const report = await prisma.imageReport.findUnique({
      where: { id: reportId },
      include: { image: true },
    });
    if (!report) return Response.json({ error: "Report not found" }, { status: 404 });
    if (report.imageId !== imageId) return Response.json({ error: "Report does not belong to this image" }, { status: 400 });

    const vehicleUpdate: Record<string, unknown> = {};
    if (report.suggestedMake) vehicleUpdate.make = report.suggestedMake;
    if (report.suggestedModel) vehicleUpdate.model = report.suggestedModel;
    if (report.suggestedYear != null) vehicleUpdate.year = report.suggestedYear;
    if (report.suggestedTrim) vehicleUpdate.trim = report.suggestedTrim;
    if (report.suggestedCountryOfOrigin) vehicleUpdate.countryOfOrigin = report.suggestedCountryOfOrigin;
    if (report.suggestedBodyStyle) vehicleUpdate.bodyStyle = report.suggestedBodyStyle as BodyStyle;
    if (report.suggestedEra) vehicleUpdate.era = report.suggestedEra as Era;
    if (report.suggestedRarity) vehicleUpdate.rarity = report.suggestedRarity as Rarity;

    if (Object.keys(vehicleUpdate).length > 0) {
      await prisma.vehicle.update({ where: { id: report.image.vehicleId }, data: vehicleUpdate });
    }

    await prisma.imageReport.delete({ where: { id: reportId } });

    return Response.json({ ok: true, fieldsApplied: Object.keys(vehicleUpdate) });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
