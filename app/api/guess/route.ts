import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { fuzzyMatch, scoreRound, TIME_LIMITS } from "@/app/lib/game";

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
  } = body as {
    roundId: string;
    rawInput: string;
    guessedVehicleId?: string;
    guessedMake?: string;
    guessedModel?: string;
    guessedYear?: number;
    timeTakenMs?: number;
    zoomLevelAtGuess?: number;
  };

  if (!roundId) {
    return Response.json({ error: "roundId is required" }, { status: 400 });
  }

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      guess: true,
      session: { select: { mode: true } },
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

  const timeLimitMs = round.timeLimitMs ?? TIME_LIMITS[mode] ?? TIME_LIMITS.hard;

  const scoring = scoreRound({
    makeCorrect: makeMatch,
    modelCorrect: modelMatch,
    yearDelta,
    elapsedMs: timeTakenMs ?? timeLimitMs,
    timeLimitMs,
    mode,
  });

  const isCorrect = makeMatch && modelMatch;

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
        modeMultiplier: scoring.modeMultiplier,
        pointsEarned: scoring.pointsEarned,
      },
    }),
    prisma.imageStats.upsert({
      where: { imageId: round.image.id },
      update: isCorrect
        ? { correctGuesses: { increment: 1 } }
        : { incorrectGuesses: { increment: 1 } },
      create: {
        imageId: round.image.id,
        correctGuesses: isCorrect ? 1 : 0,
        incorrectGuesses: isCorrect ? 0 : 1,
      },
    }),
  ]);

  return Response.json({
    guessId: guess.id,
    makeMatch,
    modelMatch,
    partialCredit,
    yearDelta,
    ...scoring,
  });
}
