// Fetches a single image with its vehicle details for pre-filling the report form.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const image = await prisma.image.findUnique({
    where: { id },
    include: { vehicle: true },
  });

  if (!image) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return Response.json({
    id: image.id,
    filename: image.filename,
    vehicleId: image.vehicleId,
    imageUrl: imageUrl(image.filename, image.vehicleId, image.transformationSignature, image.cropMethod),
    vehicle: {
      make: image.vehicle.make,
      model: image.vehicle.model,
      year: image.vehicle.year,
      trim: image.vehicle.trim,
      countryOfOrigin: image.vehicle.countryOfOrigin,
      bodyStyle: image.vehicle.bodyStyle,
      era: image.vehicle.era,
      rarity: image.vehicle.rarity,
    },
  });
}
