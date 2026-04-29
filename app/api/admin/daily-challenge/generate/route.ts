// Admin: auto-generate daily challenges for a date range.
import type { NextRequest } from "next/server";
import { generateChallengesForRange } from "@/app/lib/daily-challenge";

export async function POST(request: NextRequest) {
  const body = await request.json() as { startDate?: string; endDate?: string };

  if (!body.startDate || !body.endDate) {
    return Response.json({ error: "startDate and endDate are required" }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(body.endDate)) {
    return Response.json({ error: "Dates must be in YYYY-MM-DD format" }, { status: 400 });
  }

  const startDate = new Date(`${body.startDate}T00:00:00.000Z`);
  const endDate = new Date(`${body.endDate}T00:00:00.000Z`);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return Response.json({ error: "Invalid date value" }, { status: 400 });
  }

  if (endDate < startDate) {
    return Response.json({ error: "endDate must be on or after startDate" }, { status: 400 });
  }

  try {
    const result = await generateChallengesForRange(startDate, endDate);
    return Response.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
