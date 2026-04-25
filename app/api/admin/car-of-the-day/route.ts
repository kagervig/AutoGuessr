// Admin: list upcoming Cars of the Day (today + next 7 days), auto-generating missing entries.
import type { NextRequest } from "next/server";
import { imageUrl } from "@/app/lib/game";
import { getTodayUTCMidnight, selectAndInsertFeatured, getFeatured } from "@/app/lib/car-of-the-day";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const today = getTodayUTCMidnight();
  const from = fromParam ? new Date(`${fromParam}T00:00:00.000Z`) : today;
  const to = toParam
    ? new Date(`${toParam}T00:00:00.000Z`)
    : new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 7));

  const days: Date[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    days.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  const entries = await Promise.all(
    days.map(async (day) => {
      let featured = await getFeatured(day);
      if (!featured) {
        try {
          featured = await selectAndInsertFeatured(day);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { date: day.toISOString().slice(0, 10), error: message };
        }
      }
      return {
        date: day.toISOString().slice(0, 10),
        vehicleId: featured.vehicleId,
        imageId: featured.imageId,
        curatedBy: featured.curatedBy,
        vehicle: featured.vehicle,
        image: {
          ...featured.image,
          url: imageUrl(featured.image.filename, featured.vehicle.id),
        },
        trivia: featured.vehicle.trivia,
      };
    })
  );

  return Response.json({ entries });
}
