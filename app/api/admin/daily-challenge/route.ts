// Admin: list daily challenges ordered newest first, optionally filtered by date range.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateFilter: { gte?: Date; lte?: Date } = {}; //Prisma requires a date filter
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    const where = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

    const challenges = await prisma.dailyChallenge.findMany({
      where,
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
