// Single-date Car of the Day lookup for deep-linking archive entries.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date: dateParam } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return Response.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
  }

  const date = new Date(`${dateParam}T00:00:00.000Z`);
  if (isNaN(date.getTime())) {
    return Response.json({ error: "Invalid date" }, { status: 400 });
  }

  const entry = await prisma.featuredVehicleOfDay.findUnique({
    where: { date },
    include: {
      vehicle: { select: { id: true, make: true, model: true, trivia: true } },
      image: { select: { id: true, filename: true } },
    },
  });

  if (!entry) {
    return Response.json({ error: "No featured vehicle for this date" }, { status: 404 });
  }

  const response = Response.json({
    date: dateParam,
    vehicle: {
      id: entry.vehicle.id,
      make: entry.vehicle.make,
      model: entry.vehicle.model,
      displayModel: entry.vehicle.trivia?.displayModel ?? null,
    },
    image: {
      id: entry.image.id,
      filename: entry.image.filename,
      url: imageUrl(entry.image.filename, entry.vehicle.id),
    },
    trivia: entry.vehicle.trivia
      ? {
          productionYears: entry.vehicle.trivia.productionYears,
          engine: entry.vehicle.trivia.engine,
          layout: entry.vehicle.trivia.layout,
          regionalNames: entry.vehicle.trivia.regionalNames,
          funFacts: entry.vehicle.trivia.funFacts,
        }
      : null,
  });

  response.headers.set("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  return response;
}
