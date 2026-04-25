// Admin: re-roll the featured vehicle for a specific date, excluding all previously featured vehicles.
import type { NextRequest } from "next/server";
import { imageUrl } from "@/app/lib/game";
import { rerollFeatured } from "@/app/lib/car-of-the-day";

export async function POST(
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

  try {
    const featured = await rerollFeatured(date);
    return Response.json({
      date: dateParam,
      vehicleId: featured.vehicleId,
      imageId: featured.imageId,
      curatedBy: featured.curatedBy,
      vehicle: featured.vehicle,
      image: {
        ...featured.image,
        url: imageUrl(featured.image.filename, featured.vehicle.id),
      },
      trivia: featured.vehicle.trivia,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 400 });
  }
}
