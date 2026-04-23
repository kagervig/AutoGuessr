// Paginated list of past Cars of the Day, newest first, excluding today.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";
import { getTodayUTCMidnight } from "@/app/lib/car-of-the-day";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;
  const today = getTodayUTCMidnight();

  const [entries, total] = await Promise.all([
    prisma.featuredVehicleOfDay.findMany({
      where: { date: { lt: today } },
      orderBy: { date: "desc" },
      skip,
      take: limit,
      include: {
        vehicle: { select: { id: true, make: true, model: true } },
        image: { select: { id: true, filename: true } },
        trivia: true,
      },
    }),
    prisma.featuredVehicleOfDay.count({ where: { date: { lt: today } } }),
  ]);

  const response = Response.json({
    entries: entries.map((e) => ({
      date: e.date.toISOString().slice(0, 10),
      vehicle: {
        id: e.vehicle.id,
        make: e.vehicle.make,
        model: e.vehicle.model,
        displayModel: e.trivia?.displayModel ?? null,
      },
      image: {
        id: e.image.id,
        filename: e.image.filename,
        url: imageUrl(e.image.filename, e.vehicle.id),
      },
      trivia: e.trivia
        ? {
            productionYears: e.trivia.productionYears,
            engine: e.trivia.engine,
            layout: e.trivia.layout,
            regionalNames: e.trivia.regionalNames,
            funFacts: e.trivia.funFacts,
          }
        : null,
    })),
    page,
    total,
  });

  response.headers.set("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  return response;
}
