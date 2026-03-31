import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sessionId, finalScore } = body as { sessionId: string; finalScore: number };

  if (!sessionId) {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }

  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { rounds: { include: { guess: true } } },
  });

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.endedAt) {
    return Response.json({ error: "Session already ended" }, { status: 409 });
  }

  const correctGuesses = session.rounds.filter((r) => r.guess?.isCorrect).length;
  const roundsPlayed = session.rounds.length;

  const endedSession = await prisma.gameSession.update({
    where: { id: sessionId },
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

  return Response.json({ sessionId, finalScore: finalScore ?? 0, endedAt: endedSession.endedAt });
}
