// Returns today's Car of the Day card payload.
import { imageUrl } from "@/app/lib/game";
import { getOrCreateTodaysFeatured, getTodayUTCMidnight } from "@/app/lib/car-of-the-day";
import { DAILY_DISCOVERY_BONUS } from "@/app/lib/constants";

export const revalidate = 3600;

export async function GET() {
  const featured = await getOrCreateTodaysFeatured();
  const date = getTodayUTCMidnight();

  return Response.json({
    date: date.toISOString().slice(0, 10),
    vehicle: {
      id: featured.vehicle.id,
      make: featured.vehicle.make,
      model: featured.vehicle.model,
      displayModel: featured.vehicle.trivia?.displayModel ?? null,
    },
    image: {
      id: featured.image.id,
      filename: featured.image.filename,
      url: imageUrl(featured.image.filename, featured.vehicle.id),
    },
    trivia: featured.vehicle.trivia
      ? {
          productionYears: featured.vehicle.trivia.productionYears,
          engine: featured.vehicle.trivia.engine,
          layout: featured.vehicle.trivia.layout,
          regionalNames: featured.vehicle.trivia.regionalNames,
          funFacts: featured.vehicle.trivia.funFacts,
        }
      : null,
    bonus: DAILY_DISCOVERY_BONUS,
  });
}
