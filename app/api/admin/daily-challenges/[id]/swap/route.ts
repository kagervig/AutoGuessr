// Admin: manually swap a single image slot in a daily challenge.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { slotIndex, imageId } = await request.json() as { slotIndex: number; imageId: string };

  if (typeof slotIndex !== "number" || slotIndex < 0 || slotIndex > 9) {
    return Response.json({ error: "slotIndex must be 0–9" }, { status: 400 });
  }
  if (!imageId) {
    return Response.json({ error: "imageId is required" }, { status: 400 });
  }

  const challenge = await prisma.dailyChallenge.findUnique({ where: { id } });
  if (!challenge) {
    return Response.json({ error: "Challenge not found" }, { status: 404 });
  }

  const img = await prisma.image.findUnique({
    where: { id: imageId },
    select: { id: true, filename: true, isActive: true, vehicleId: true, isHardcoreEligible: true, vehicle: { select: { id: true, make: true, model: true, year: true } } },
  });

  if (!img || !img.isActive) {
    return Response.json({ error: "Image not found or inactive" }, { status: 400 });
  }

  // Ensure the image is not already in another slot
  const otherSlots = challenge.imageIds.filter((_, i) => i !== slotIndex);
  if (otherSlots.includes(imageId)) {
    return Response.json({ error: "Image is already in this challenge" }, { status: 400 });
  }

  const newImageIds = [...challenge.imageIds];
  newImageIds[slotIndex] = imageId;
  await prisma.dailyChallenge.update({ where: { id }, data: { imageIds: newImageIds, curatedBy: "admin" } });

  return Response.json({
    slotIndex,
    image: {
      id: img.id,
      url: imageUrl(img.filename, img.vehicle.id),
      vehicleId: img.vehicle.id,
      vehicleName: `${img.vehicle.make} ${img.vehicle.model}`,
      year: img.vehicle.year,
      isHardcoreEligible: img.isHardcoreEligible,
    },
  });
}
