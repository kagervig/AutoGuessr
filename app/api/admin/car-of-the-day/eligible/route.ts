// Admin: list eligible vehicles for a given date, excluding all previously featured vehicles.
import type { NextRequest } from "next/server";
import { imageUrl } from "@/app/lib/game";
import { getEligiblePool } from "@/app/lib/car-of-the-day";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const dateParam = searchParams.get("date");

  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return Response.json({ error: "date query param required (YYYY-MM-DD)" }, { status: 400 });
  }

  const pool = await getEligiblePool();

  const vehicles = pool.map((v) => {
    const img = v.images[0] ?? null;
    return {
      id: v.id,
      make: v.make,
      model: v.model,
      image: img ? { id: img.id, filename: img.filename, url: imageUrl(img.filename, v.id) } : null,
    };
  });

  return Response.json({ vehicles });
}
