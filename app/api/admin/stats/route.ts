import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const vehicleId = searchParams.get("vehicleId");
  const make      = searchParams.get("make");
  const model     = searchParams.get("model");

  const images = await prisma.image.findMany({
    where: {
      isActive: true,
      ...(vehicleId ? { vehicleId } : {}),
      ...(make || model
        ? { vehicle: { ...(make ? { make } : {}), ...(model ? { model } : {}) } }
        : {}),
    },
    select: {
      id: true,
      filename: true,
      vehicleId: true,
      vehicle: { select: { make: true, model: true, year: true } },
      stats: {
        select: {
          correctGuesses: true,
          incorrectGuesses: true,
          skipCount: true,
          thumbsUp: true,
          thumbsDown: true,
          reportCount: true,
        },
      },
    },
    orderBy: { uploadedAt: "desc" },
  });

  return Response.json(
    images.map((img) => ({ ...img, imageUrl: imageUrl(img.filename, img.vehicleId) }))
  );
}
