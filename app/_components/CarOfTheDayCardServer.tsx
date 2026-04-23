// Server component: fetches today's Car of the Day and reads the cotd_found_dates cookie.
import { cookies } from "next/headers";
import { imageUrl } from "@/app/lib/game";
import { getOrCreateTodaysFeatured, getTodayUTCMidnight } from "@/app/lib/car-of-the-day";
import { CarOfTheDayCard } from "./CarOfTheDayCard";
import type { CarOfTheDayData } from "./CarOfTheDayCard";

export async function CarOfTheDayCardServer() {
  let data: CarOfTheDayData | null = null;

  try {
    const featured = await getOrCreateTodaysFeatured();
    const date = getTodayUTCMidnight();

    data = {
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
    };
  } catch {
    // No eligible vehicle — render nothing rather than crashing the home page
    return null;
  }

  const cookieStore = await cookies();
  const todayStr = getTodayUTCMidnight().toISOString().slice(0, 10);
  const foundDatesRaw = cookieStore.get("cotd_found_dates")?.value;
  let isFound = false;
  if (foundDatesRaw) {
    try {
      const dates: string[] = JSON.parse(decodeURIComponent(foundDatesRaw));
      isFound = dates.includes(todayStr);
    } catch {
      // Malformed cookie — treat as not found
    }
  }

  return <CarOfTheDayCard data={data} isFound={isFound} />;
}
