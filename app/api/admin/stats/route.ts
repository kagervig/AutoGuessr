import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";

export async function GET() {
  const images = await prisma.image.findMany({
    where: { isActive: true },
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
