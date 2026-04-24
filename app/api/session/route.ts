import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";

// Session end is handled by /api/session/end

export async function GET(request: NextRequest) {
  const gameId = request.nextUrl.searchParams.get("gameId");
  if (!gameId) {
    return Response.json({ error: "gameId is required" }, { status: 400 });
  }

  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    include: {
      dailyChallenge: { select: { challengeNumber: true } },
      rounds: {
        orderBy: { sequenceNumber: "asc" },
        include: {
          image: {
            select: {
              id: true,
              filename: true,
              vehicleId: true,
              vehicle: {
                select: { make: true, model: true, year: true, countryOfOrigin: true },
              },
            },
          },
          guess: {
            include: {
              guessedVehicle: {
                select: { make: true, model: true, year: true },
              },
            },
          },
        },
      },
    },
  });

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  // Compute rank and leaderboard for daily challenge sessions
  let dailyRank: number | null = null;
  let dailyLeaderboard: { id: string; initials: string; finalScore: number }[] = [];

  if (session.dailyChallengeId && session.endedAt && session.finalScore !== null) {
    const [rank, leaderboard] = await Promise.all([
      prisma.gameSession.count({
        where: {
          dailyChallengeId: session.dailyChallengeId,
          endedAt: { not: null },
          finalScore: { gt: session.finalScore },
        },
      }),
      prisma.gameSession.findMany({
        where: {
          dailyChallengeId: session.dailyChallengeId,
          endedAt: { not: null },
          finalScore: { not: null, gt: 0 },
          initials: { not: null },
        },
        orderBy: { finalScore: "desc" },
        take: 10,
        select: { id: true, initials: true, finalScore: true },
      }),
    ]);
    dailyRank = rank + 1;
    dailyLeaderboard = leaderboard as { id: string; initials: string; finalScore: number }[];
  }

  // Enrich rounds with imageUrl
  const rounds = session.rounds.map((r) => ({
    ...r,
    imageUrl: imageUrl(r.image.filename, r.image.vehicleId),
  }));

  return Response.json({
    ...session,
    rounds,
    personalBest: null,
    dailyChallengeNumber: session.dailyChallenge?.challengeNumber ?? null,
    dailyRank,
    dailyLeaderboard,
  });
}

