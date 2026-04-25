// Cron endpoint: ensure Car of the Day is generated for today (and optionally tomorrow).
// Called every day at 00:00 UTC by Vercel Cron.
import type { NextRequest } from "next/server";
import { getOrCreateTodaysFeatured, selectAndInsertFeatured } from "@/app/lib/car-of-the-day";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorised" }, { status: 401 });
    }
  }

  try {
    // 1. Ensure today is generated
    const todayFeatured = await getOrCreateTodaysFeatured();
    const results: Array<{ date: string; vehicleId?: string; status?: string }> = [
      { date: "today", vehicleId: todayFeatured.vehicle.id }
    ];

    // 2. Pre-generate tomorrow as well to be safe
    const now = new Date();
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    
    const existingTomorrow = await prisma.featuredVehicleOfDay.findUnique({
      where: { date: tomorrow },
    });

    if (!existingTomorrow) {
      const tomorrowFeatured = await selectAndInsertFeatured(tomorrow);
      results.push({ date: "tomorrow", vehicleId: tomorrowFeatured.vehicle.id });
    } else {
      results.push({ date: "tomorrow", status: "already exists" });
    }

    return Response.json({ status: "success", results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[cron-cotd] Failure: ${message}`);
    return Response.json({ status: "error", message }, { status: 500 });
  }
}
