// Cron endpoint: generate the next 7 days of daily challenges and email admin for review.
// Called every Sunday at 01:00 UTC by Vercel Cron.
import type { NextRequest } from "next/server";
import { prisma } from "../../../lib/prisma";
import { generateDailyChallenge, getTodayUTCMidnight, getChallengeNumber } from "../../../lib/daily-challenge";
import { sendDailyChallengeReviewEmail } from "../../../lib/email";

const DAYS_AHEAD = 7;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorised" }, { status: 401 });
    }
  }

  const today = getTodayUTCMidnight();
  const targetDates: Date[] = [];
  for (let i = 1; i <= DAYS_AHEAD; i++) {
    targetDates.push(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + i)));
  }

  // Find which dates already have a challenge record
  const existing = await prisma.dailyChallenge.findMany({
    where: { date: { in: targetDates } },
    select: { date: true },
  });
  const existingDates = new Set(existing.map((c) => c.date.toISOString()));

  const generated: { challengeNumber: number; date: string }[] = [];
  const skipped: number[] = [];

  for (const date of targetDates) {
    if (existingDates.has(date.toISOString())) {
      skipped.push(getChallengeNumber(date));
      continue;
    }
    try {
      const challenge = await generateDailyChallenge(date);
      generated.push({
        challengeNumber: challenge.challengeNumber,
        date: date.toISOString().slice(0, 10),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[cron] Failed to generate challenge for ${date.toISOString().slice(0, 10)}: ${message}`);
    }
  }

  if (generated.length > 0) {
    try {
      await sendDailyChallengeReviewEmail(generated);
    } catch (err) {
      // Email failure is non-fatal — challenges are still generated
      console.error("[cron] Failed to send review email:", err);
    }
  }

  return Response.json({ generated, skipped });
}
