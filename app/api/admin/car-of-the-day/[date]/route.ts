// Admin: override the featured vehicle or image for a specific date.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";

const VEHICLE_INCLUDE = {
  vehicle: { select: { id: true, make: true, model: true, trivia: true } },
  image: { select: { id: true, filename: true } },
} as const;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date: dateParam } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return Response.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
  }

  const date = new Date(`${dateParam}T00:00:00.000Z`);
  if (isNaN(date.getTime())) {
    return Response.json({ error: "Invalid date" }, { status: 400 });
  }

  const body = await request.json() as { vehicleId?: string; imageId?: string; curatedBy?: string };

  if (!body.vehicleId && !body.imageId) {
    return Response.json({ error: "vehicleId or imageId required" }, { status: 400 });
  }

  const existing = await prisma.featuredVehicleOfDay.findUnique({ where: { date } });

  let resolvedImageId = body.imageId ?? existing?.imageId;

  if (body.vehicleId) {
    const trivia = await prisma.vehicleTrivia.findUnique({ where: { vehicleId: body.vehicleId } });
    if (!trivia) {
      return Response.json({ error: "Vehicle has no trivia. Add trivia before featuring." }, { status: 400 });
    }

    // When changing the vehicle, always pick a fresh image from that vehicle.
    if (!body.imageId && body.vehicleId !== existing?.vehicleId) {
      const images = await prisma.image.findMany({
        where: { vehicleId: body.vehicleId, isActive: true },
        select: { id: true, isCropped: true, isLogoVisible: true },
      });
      if (images.length === 0) {
        return Response.json({ error: "Vehicle has no active images." }, { status: 400 });
      }
      const preferred = images.filter((img) => !img.isCropped && img.isLogoVisible);
      const pool = preferred.length > 0 ? preferred : images;
      resolvedImageId = pool[Math.floor(Math.random() * pool.length)].id;
    }
  }

  if (!body.vehicleId && !existing?.vehicleId) {
    return Response.json({ error: "Cannot determine vehicleId." }, { status: 400 });
  }
  if (!resolvedImageId) {
    return Response.json({ error: "Cannot determine imageId." }, { status: 400 });
  }

  const featured = await prisma.featuredVehicleOfDay.upsert({
    where: { date },
    update: {
      vehicleId: body.vehicleId ?? existing!.vehicleId,
      imageId: resolvedImageId,
      curatedBy: body.curatedBy ?? null,
    },
    create: {
      date,
      vehicleId: body.vehicleId!,
      imageId: resolvedImageId,
      curatedBy: body.curatedBy ?? null,
    },
    include: VEHICLE_INCLUDE,
  });

  return Response.json({
    date: dateParam,
    vehicleId: featured.vehicleId,
    imageId: featured.imageId,
    curatedBy: featured.curatedBy,
    vehicle: featured.vehicle,
    image: {
      ...featured.image,
      url: imageUrl(featured.image.filename, featured.vehicle.id),
    },
    trivia: featured.vehicle.trivia,
  });
}
