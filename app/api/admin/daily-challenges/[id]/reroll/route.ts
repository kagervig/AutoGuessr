// Admin: re-roll a single image slot in a daily challenge.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { selectReplacementImage } from "@/app/lib/daily-challenge";
import { imageUrl } from "@/app/lib/game";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { slotIndex } = await request.json() as { slotIndex: number };

  if (typeof slotIndex !== "number" || slotIndex < 0 || slotIndex > 9) {
    return Response.json({ error: "slotIndex must be 0–9" }, { status: 400 });
  }

  const challenge = await prisma.dailyChallenge.findUnique({ where: { id } });
  if (!challenge) {
    return Response.json({ error: "Challenge not found" }, { status: 404 });
  }

  let newImageId: string;
  try {
    newImageId = await selectReplacementImage(challenge, slotIndex);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Selection failed" },
      { status: 400 }
    );
  }

  const newImageIds = [...challenge.imageIds];
  newImageIds[slotIndex] = newImageId;
  await prisma.dailyChallenge.update({ where: { id }, data: { imageIds: newImageIds, curatedBy: "admin" } });

  const img = await prisma.image.findUnique({
    where: { id: newImageId },
    select: { id: true, filename: true, isHardcoreEligible: true, vehicle: { select: { id: true, make: true, model: true, year: true } } },
  });
  if (!img) return Response.json({ error: "Image not found after selection" }, { status: 500 });

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
