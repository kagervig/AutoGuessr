import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { gameId, finalScore } = body as { gameId: string; finalScore: number };

  if (!gameId) {
    return Response.json({ error: "gameId is required" }, { status: 400 });
  }

  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    select: {
      id: true,
      playerId: true,
      mode: true,
      endedAt: true,
      sessionToken: true,
      rounds: { select: { guess: { select: { isCorrect: true } } } },
    },
  });

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const cookie = request.cookies.get(`st_${gameId}`)?.value;
  if (!cookie || cookie !== session.sessionToken) {
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }

  if (session.endedAt) {
    return Response.json({ error: "Session already ended" }, { status: 409 });
  }

  const correctGuesses = session.rounds.filter((r) => r.guess?.isCorrect).length;
  const roundsPlayed = session.rounds.length;

  const endedSession = await prisma.gameSession.update({
    where: { id: gameId },
    data: { endedAt: new Date(), finalScore: finalScore ?? 0 },
  });

  if (session.playerId) {
    const existing = await prisma.playerStats.findUnique({
      where: { playerId: session.playerId },
    });

    const prevStreak = existing?.currentStreak ?? 0;
    const prevBest = existing?.bestStreak ?? 0;
    const newStreak = correctGuesses === roundsPlayed ? prevStreak + 1 : 0;
    const newBest = Math.max(prevBest, newStreak);

    await prisma.playerStats.upsert({
      where: { playerId: session.playerId },
      update: {
        totalScore: { increment: finalScore ?? 0 },
        gamesPlayed: { increment: 1 },
        roundsPlayed: { increment: roundsPlayed },
        correctGuesses: { increment: correctGuesses },
        currentStreak: newStreak,
        bestStreak: newBest,
      },
      create: {
        playerId: session.playerId,
        totalScore: finalScore ?? 0,
        gamesPlayed: 1,
        roundsPlayed,
        correctGuesses,
        currentStreak: newStreak,
        bestStreak: newBest,
      },
    });
  }

  return Response.json({ gameId, finalScore: finalScore ?? 0, endedAt: endedSession.endedAt });
}
