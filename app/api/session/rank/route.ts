import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: NextRequest) {
  const gameId = request.nextUrl.searchParams.get("gameId");

  if (!gameId) {
    return Response.json({ error: "gameId is required" }, { status: 400 });
  }

  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    select: {
      finalScore: true,
      dailyChallengeId: true,
    },
  });

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.dailyChallengeId === null) {
    return Response.json({ error: "Not a daily challenge session" }, { status: 400 });
  }

  if (session.finalScore === null) {
    return Response.json({ error: "Session has not finished yet" }, { status: 400 });
  }

  // Calculate rank: count of players with a strictly higher score + 1
  const higherScoresCount = await prisma.gameSession.count({
    where: {
      dailyChallengeId: session.dailyChallengeId,
      finalScore: { gt: session.finalScore },
      endedAt: { not: null },
    },
  });

  const totalPlayers = await prisma.gameSession.count({
    where: {
      dailyChallengeId: session.dailyChallengeId,
      endedAt: { not: null },
    },
  });

  const rank = higherScoresCount + 1;
  const percentile = totalPlayers > 0 ? Math.round(((totalPlayers - rank) / totalPlayers) * 100) : 100;

  return Response.json({
    rank,
    totalPlayers,
    percentile,
  });
}
