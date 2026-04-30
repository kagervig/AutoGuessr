// Admin: list all daily challenges ordered newest first.
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";

export async function GET() {
  try {
    const challenges = await prisma.dailyChallenge.findMany({
      orderBy: { date: "desc" },
    });

    const allImageIds = [...new Set(challenges.flatMap((c) => c.imageIds))];

    const images = await prisma.image.findMany({
      where: { id: { in: allImageIds } },
      select: {
        id: true,
        filename: true,
        vehicle: { select: { id: true, make: true, model: true } },
      },
    });

    const imageMap = new Map(
      images.map((img) => [
        img.id,
        {
          id: img.id,
          url: imageUrl(img.filename, img.vehicle.id),
          make: img.vehicle.make,
          model: img.vehicle.model,
        },
      ])
    );

    return Response.json({
      challenges: challenges.map((c) => ({
        ...c,
        date: c.date.toISOString().slice(0, 10),
        generatedAt: c.generatedAt.toISOString(),
        images: c.imageIds.map((id) => imageMap.get(id) ?? { id, url: null, make: null, model: null }),
      })),
    });
  } catch (err) {
    console.error("[daily-challenge GET]", err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
