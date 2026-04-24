// Admin: list daily challenges (upcoming with image data, recent past with stats).
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";
import { getTodayUTCMidnight } from "@/app/lib/daily-challenge";

export async function GET() {
  const today = getTodayUTCMidnight();

  const [upcoming, past] = await Promise.all([
    prisma.dailyChallenge.findMany({
      where: { date: { gte: today } },
      orderBy: { date: "asc" },
      select: { id: true, challengeNumber: true, date: true, isPublished: true, curatedBy: true, imageIds: true },
    }),
    prisma.dailyChallenge.findMany({
      where: { isPublished: true, date: { lt: today } },
      orderBy: { date: "desc" },
      take: 30,
      select: {
        id: true,
        challengeNumber: true,
        date: true,
        isPublished: true,
        _count: { select: { sessions: { where: { endedAt: { not: null } } } } },
        sessions: {
          where: { endedAt: { not: null }, finalScore: { not: null } },
          orderBy: { finalScore: "desc" },
          take: 1,
          select: { finalScore: true },
        },
      },
    }),
  ]);

  // Batch-fetch all image data for upcoming challenges
  const allImageIds = upcoming.flatMap((c) => c.imageIds);
  const images = await prisma.image.findMany({
    where: { id: { in: allImageIds } },
    select: {
      id: true,
      filename: true,
      isHardcoreEligible: true,
      vehicle: { select: { id: true, make: true, model: true, year: true } },
    },
  });
  const imageMap = new Map(images.map((img) => [img.id, img]));

  return Response.json({
    upcoming: upcoming.map((c) => ({
      id: c.id,
      challengeNumber: c.challengeNumber,
      date: c.date.toISOString().slice(0, 10),
      isPublished: c.isPublished,
      curatedBy: c.curatedBy,
      images: c.imageIds.map((imgId) => {
        const img = imageMap.get(imgId);
        if (!img) return null;
        return {
          id: img.id,
          url: imageUrl(img.filename, img.vehicle.id),
          vehicleId: img.vehicle.id,
          vehicleName: `${img.vehicle.make} ${img.vehicle.model}`,
          year: img.vehicle.year,
          isHardcoreEligible: img.isHardcoreEligible,
        };
      }).filter(Boolean),
    })),
    past: past.map((c) => ({
      id: c.id,
      challengeNumber: c.challengeNumber,
      date: c.date.toISOString().slice(0, 10),
      isPublished: c.isPublished,
      playerCount: c._count.sessions,
      topScore: c.sessions[0]?.finalScore ?? null,
    })),
  });
}
