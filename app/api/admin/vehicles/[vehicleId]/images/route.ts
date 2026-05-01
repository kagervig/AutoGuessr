// Admin: returns active images for a vehicle, used by the challenge car selector.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";

type Params = { params: Promise<{ vehicleId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { vehicleId } = await params;

  const images = await prisma.image.findMany({
    where: { vehicleId, isActive: true },
    select: {
      id: true,
      filename: true,
      vehicle: { select: { id: true } },
    },
    orderBy: { uploadedAt: "desc" },
  });

  return Response.json({
    images: images.map((img) => ({
      id: img.id,
      url: imageUrl(img.filename, img.vehicle.id),
    })),
  });
}
