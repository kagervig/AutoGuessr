// GET /api/daily/[date]/leaderboard — top 50 entries for a challenge date + user's own entry.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date: dateStr } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return Response.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
  }

  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (isNaN(date.getTime())) {
    return Response.json({ error: "Invalid date" }, { status: 400 });
  }

  const challenge = await prisma.dailyChallenge.findUnique({
    where: { date },
    select: { id: true, challengeNumber: true, date: true, isPublished: true },
  });

  if (!challenge || !challenge.isPublished) {
    return Response.json({ error: "Challenge not found" }, { status: 404 });
  }

  const sessions = await prisma.gameSession.findMany({
    where: {
      dailyChallengeId: challenge.id,
      endedAt: { not: null },
      finalScore: { not: null, gt: 0 },
      initials: { not: null },
    },
    orderBy: { finalScore: "desc" },
    take: 50,
    select: { id: true, initials: true, finalScore: true, endedAt: true },
  });

  const entries = sessions.map((s, i) => ({
    rank: i + 1,
    initials: s.initials as string,
    score: s.finalScore as number,
    completedAt: s.endedAt!.toISOString(),
  }));

  // Look up user's own entry via the daily session cookie
  const cookieSessionId = request.cookies.get(`dc_${challenge.challengeNumber}`)?.value;
  let userEntry: { rank: number; initials: string; score: number } | null = null;

  if (cookieSessionId) {
    const userSession = await prisma.gameSession.findUnique({
      where: { id: cookieSessionId },
      select: { initials: true, finalScore: true, endedAt: true },
    });
    if (userSession?.endedAt && userSession.finalScore !== null) {
      const higherCount = await prisma.gameSession.count({
        where: {
          dailyChallengeId: challenge.id,
          endedAt: { not: null },
          finalScore: { gt: userSession.finalScore },
        },
      });
      userEntry = {
        rank: higherCount + 1,
        initials: userSession.initials ?? "???",
        score: userSession.finalScore,
      };
    }
  }

  return Response.json({
    challengeNumber: challenge.challengeNumber,
    date: challenge.date.toISOString().slice(0, 10),
    entries,
    userEntry,
  });
}
