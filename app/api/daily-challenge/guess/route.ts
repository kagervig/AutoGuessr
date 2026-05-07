// Endpoint for submitting a guess in a daily challenge session.
import { after } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { scoreRound, TIME_LIMITS } from "@/app/lib/game";
import {
  GameMode,
  DAILY_DISCOVERY_BONUS,
  DAILY_HARDCORE_BONUS,
  DAILY_RARE_FIND_BONUS,
} from "@/app/lib/constants";

type RoundBonus = { isHardcore: boolean; isCotd: boolean; isRareFind: boolean };
type BonusEntry = { type: "hardcore" | "cotd" | "rareFind"; points: number };

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    sessionId: string;
    roundIndex: number;
    vehicleId: string;
    timeTakenMs?: number;
  };

  const { sessionId, roundIndex, vehicleId, timeTakenMs } = body;

  if (!sessionId || roundIndex === undefined || roundIndex === null || !vehicleId) {
    return Response.json(
      { error: "sessionId, roundIndex, and vehicleId are required" },
      { status: 400 }
    );
  }

  const session = await prisma.dailyChallengeSession.findUnique({
    where: { id: sessionId },
    select: {
      answerVehicleIds: true,
      roundBonuses: true,
      roundScores: true,
      completedAt: true,
      challengeId: true,
      challenge: { select: { imageIds: true } },
    },
  });

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.completedAt) {
    return Response.json({ error: "Session already completed" }, { status: 409 });
  }

  if (roundIndex < 0 || roundIndex >= session.answerVehicleIds.length) {
    return Response.json({ error: "Invalid roundIndex" }, { status: 400 });
  }

  if (roundIndex < session.roundScores.length) {
    return Response.json({ error: "Round already guessed" }, { status: 409 });
  }

  if (roundIndex > session.roundScores.length) {
    return Response.json({ error: "Rounds must be guessed in order" }, { status: 400 });
  }

  const correctVehicleId = session.answerVehicleIds[roundIndex];
  const bonusFlags = (session.roundBonuses as RoundBonus[])[roundIndex];
  const isCorrect = vehicleId === correctVehicleId;
  const timeLimitMs = TIME_LIMITS[GameMode.Daily];

  const scoring = scoreRound({
    makeCorrect: isCorrect,
    modelCorrect: isCorrect,
    yearDelta: null,
    elapsedMs: timeTakenMs ?? timeLimitMs,
    timeLimitMs,
    mode: GameMode.Daily,
    isDailyDiscovery: false,
  });

  const bonusesEarned: BonusEntry[] = [];
  if (isCorrect) {
    if (bonusFlags.isHardcore) bonusesEarned.push({ type: "hardcore", points: DAILY_HARDCORE_BONUS });
    if (bonusFlags.isCotd) bonusesEarned.push({ type: "cotd", points: DAILY_DISCOVERY_BONUS });
    if (bonusFlags.isRareFind) bonusesEarned.push({ type: "rareFind", points: DAILY_RARE_FIND_BONUS });
  }

  const bonusTotal = bonusesEarned.reduce((sum, b) => sum + b.points, 0);
  const score = scoring.pointsEarned + bonusTotal;
  const updatedScores = [...session.roundScores, score];
  const isFinal = updatedScores.length === session.answerVehicleIds.length;
  const totalScore = isFinal ? updatedScores.reduce((sum, s) => sum + s, 0) : undefined;

  await prisma.dailyChallengeSession.update({
    where: { id: sessionId },
    data: {
      roundScores: updatedScores,
      ...(isFinal ? { totalScore, completedAt: new Date() } : {}),
    },
  });

  const imageId = session.challenge.imageIds[roundIndex];
  after(() => {
    prisma.imageStats
      .findUnique({ where: { imageId }, select: { correctGuesses: true, incorrectGuesses: true } })
      .then((existing) => {
        const prevCorrect = existing?.correctGuesses ?? 0;
        const prevIncorrect = existing?.incorrectGuesses ?? 0;
        const newCorrect = prevCorrect + (isCorrect ? 1 : 0);
        const newIncorrect = prevIncorrect + (isCorrect ? 0 : 1);
        const newCorrectRatio =
          newCorrect + newIncorrect === 0 ? 1.0 : newCorrect / (newCorrect + newIncorrect);
        return prisma.imageStats.upsert({
          where: { imageId },
          update: isCorrect
            ? { correctGuesses: { increment: 1 }, totalServes: { increment: 1 }, correctRatio: newCorrectRatio }
            : { incorrectGuesses: { increment: 1 }, totalServes: { increment: 1 }, correctRatio: newCorrectRatio },
          create: {
            imageId,
            correctGuesses: isCorrect ? 1 : 0,
            incorrectGuesses: isCorrect ? 0 : 1,
            totalServes: 1,
            correctRatio: isCorrect ? 1.0 : 0.0,
          },
        });
      });
  });

  if (!isFinal) {
    return Response.json({ correct: isCorrect, correctVehicleId, score, bonusesEarned, isFinal: false });
  }

  const [higherCount, totalPlayers] = await Promise.all([
    prisma.dailyChallengeSession.count({
      where: {
        challengeId: session.challengeId,
        totalScore: { gt: totalScore },
        completedAt: { not: null },
      },
    }),
    prisma.dailyChallengeSession.count({
      where: {
        challengeId: session.challengeId,
        completedAt: { not: null },
      },
    }),
  ]);

  const rank = higherCount + 1;
  const percentile = totalPlayers > 0 ? Math.round(((totalPlayers - rank) / totalPlayers) * 100) : 100;

  return Response.json({
    correct: isCorrect,
    correctVehicleId,
    score,
    bonusesEarned,
    isFinal: true,
    totalScore,
    rank,
    totalPlayers,
    percentile,
  });
}
