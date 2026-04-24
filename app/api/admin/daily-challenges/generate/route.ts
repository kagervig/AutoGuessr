// Admin: manually trigger challenge generation for a date range.
import type { NextRequest } from "next/server";
import { generateDailyChallenge, getChallengeNumber } from "@/app/lib/daily-challenge";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json() as { fromDate: string; toDate: string };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(body.toDate)) {
    return Response.json({ error: "fromDate and toDate must be YYYY-MM-DD" }, { status: 400 });
  }

  const from = new Date(`${body.fromDate}T00:00:00.000Z`);
  const to = new Date(`${body.toDate}T00:00:00.000Z`);
  if (from > to) {
    return Response.json({ error: "fromDate must be before or equal to toDate" }, { status: 400 });
  }

  const dates: Date[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    dates.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  const existing = await prisma.dailyChallenge.findMany({
    where: { date: { in: dates } },
    select: { date: true },
  });
  const existingDates = new Set(existing.map((c) => c.date.toISOString()));

  const generated: number[] = [];
  const skipped: number[] = [];
  const errors: { challengeNumber: number; error: string }[] = [];

  for (const date of dates) {
    const num = getChallengeNumber(date);
    if (existingDates.has(date.toISOString())) {
      skipped.push(num);
      continue;
    }
    try {
      await generateDailyChallenge(date);
      generated.push(num);
    } catch (err) {
      errors.push({ challengeNumber: num, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return Response.json({ generated, skipped, errors });
}
