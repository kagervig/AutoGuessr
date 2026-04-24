// GET /api/daily/archive — paginated list of past published challenges, newest first.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getTodayUTCMidnight } from "@/app/lib/daily-challenge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;
  const today = getTodayUTCMidnight();

  const [challenges, total] = await Promise.all([
    prisma.dailyChallenge.findMany({
      where: { isPublished: true, date: { lt: today } },
      orderBy: { date: "desc" },
      skip,
      take: limit,
      select: {
        challengeNumber: true,
        date: true,
        sessions: {
          where: { endedAt: { not: null }, finalScore: { not: null } },
          orderBy: { finalScore: "desc" },
          take: 1,
          select: { finalScore: true },
        },
        _count: {
          select: { sessions: { where: { endedAt: { not: null } } } },
        },
      },
    }),
    prisma.dailyChallenge.count({ where: { isPublished: true, date: { lt: today } } }),
  ]);

  return Response.json({
    challenges: challenges.map((c) => ({
      challengeNumber: c.challengeNumber,
      date: c.date.toISOString().slice(0, 10),
      playerCount: c._count.sessions,
      topScore: c.sessions[0]?.finalScore ?? null,
      userScore: null,
      userRank: null,
    })),
    total,
    page,
  });
}
