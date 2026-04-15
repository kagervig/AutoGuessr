import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { fuzzyMatch, proLevelBonus, scoreRound, TIME_LIMITS } from "@/app/lib/game";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    roundId,
    rawInput,
    guessedVehicleId,
    guessedMake,
    guessedModel,
    guessedYear,
    timeTakenMs,
    zoomLevelAtGuess,
    panelsRevealed,
  } = body as {
    roundId: string;
    rawInput: string;
    guessedVehicleId?: string;
    guessedMake?: string;
    guessedModel?: string;
    guessedYear?: number;
    timeTakenMs?: number;
    zoomLevelAtGuess?: number;
    panelsRevealed?: number;
  };

  if (!roundId) {
    return Response.json({ error: "roundId is required" }, { status: 400 });
  }

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      guess: true,
      session: { select: { mode: true, sessionToken: true } },
      image: {
        select: {
          id: true,
          vehicleId: true,
          vehicle: {
            select: {
              make: true,
              model: true,
              year: true,
              aliases: { select: { alias: true, aliasType: true } },
            },
          },
        },
      },
    },
  });

  if (!round) {
    return Response.json({ error: "Round not found" }, { status: 404 });
  }

  if (round.guess) {
    return Response.json({ error: "Round already has a guess" }, { status: 409 });
  }

  const cookie = request.cookies.get(`st_${round.gameId}`)?.value;
  if (!cookie || cookie !== round.session.sessionToken) {
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }

  const vehicle = round.image.vehicle;
  const mode = round.session.mode;

  let makeMatch: boolean;
  let modelMatch: boolean;
  let partialCredit: number;
  let yearDelta: number | null = null;

  if (guessedVehicleId) {
    // Easy/practice mode: direct vehicle ID comparison
    const isMatch = guessedVehicleId === round.image.vehicleId;
    makeMatch = isMatch;
    modelMatch = isMatch;
    partialCredit = isMatch ? 2 : 0;
  } else if (guessedMake || guessedModel) {
    const makeAliases = vehicle.aliases
      .filter((a) => a.aliasType === "make" || a.aliasType === "full")
      .map((a) => a.alias);

    const modelAliases = vehicle.aliases
      .filter((a) => a.aliasType === "model" || a.aliasType === "full" || a.aliasType === "nickname")
      .map((a) => a.alias);

    makeMatch = fuzzyMatch(guessedMake ?? "", vehicle.make, makeAliases);
    modelMatch = fuzzyMatch(guessedModel ?? "", vehicle.model, modelAliases);
    partialCredit = makeMatch && modelMatch ? 2 : makeMatch ? 1 : 0;

    if (guessedYear !== undefined && guessedYear !== null) {
      yearDelta = Math.abs(guessedYear - vehicle.year);
    }
  } else {
    // Timeout — no answer given
    makeMatch = false;
    modelMatch = false;
    partialCredit = 0;
  }

  const timeLimitMs = round.timeLimitMs ?? TIME_LIMITS[mode] ?? TIME_LIMITS.standard;

  const scoring = scoreRound({
    makeCorrect: makeMatch,
    modelCorrect: modelMatch,
    yearDelta,
    elapsedMs: timeTakenMs ?? timeLimitMs,
    timeLimitMs,
    mode,
    panelsRevealed,
  });

  const isCorrect = makeMatch && modelMatch;

  // Fetch current stats before recording to compute the pro bonus on historical data only
  const existingStats = await prisma.imageStats.findUnique({
    where: { imageId: round.image.id },
    select: { correctGuesses: true, incorrectGuesses: true },
  });

  const proBonus =
    isCorrect && existingStats
      ? proLevelBonus(existingStats.correctGuesses, existingStats.incorrectGuesses)
      : 0;

  const totalPointsEarned = scoring.pointsEarned + proBonus;

  const imageId = round.image.id;

  // Compute new correctRatio from known pre-guess counts so we can write it in a single upsert
  const prevCorrect = existingStats?.correctGuesses ?? 0;
  const prevIncorrect = existingStats?.incorrectGuesses ?? 0;
  const newCorrect = prevCorrect + (isCorrect ? 1 : 0);
  const newIncorrect = prevIncorrect + (isCorrect ? 0 : 1);
  const newCorrectRatio = newCorrect + newIncorrect === 0 ? 1.0 : newCorrect / (newCorrect + newIncorrect);

  const [guess] = await prisma.$transaction([
    prisma.guess.create({
      data: {
        roundId,
        rawInput: rawInput ?? "",
        guessedVehicleId: guessedVehicleId ?? null,
        isCorrect,
        partialCredit,
        yearDelta,
        timeTakenMs: timeTakenMs ?? null,
        zoomLevelAtGuess: zoomLevelAtGuess ?? null,
        makePoints: scoring.makePoints,
        modelPoints: scoring.modelPoints,
        yearBonus: scoring.yearBonus,
        timeBonus: scoring.timeBonus,
        proBonus,
        modeMultiplier: scoring.modeMultiplier,
        pointsEarned: totalPointsEarned,
      },
    }),
    prisma.imageStats.upsert({
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
    }),
  ]);

  return Response.json({
    guessId: guess.id,
    makeMatch,
    modelMatch,
    partialCredit,
    yearDelta,
    vehicle: { make: vehicle.make, model: vehicle.model, year: vehicle.year },
    ...scoring,
    proBonus,
    pointsEarned: totalPointsEarned,
  });
}
