import { after } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { fuzzyMatch, scoreRound, TIME_LIMITS } from "@/app/lib/game";
import { GameMode, DAILY_RARE_FIND_BONUS } from "@/app/lib/constants";

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
      session: { select: { mode: true, sessionToken: true, featuredVehicleIdAtStart: true } },
      image: {
        select: {
          id: true,
          vehicleId: true,
          vehicle: {
            select: {
              make: true,
              model: true,
              year: true,
              rarity: true,
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
  const mode = round.session.mode as unknown as GameMode;

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

  const isCorrect = makeMatch && modelMatch;
  const isDailyDiscovery =
    isCorrect &&
    !!round.session.featuredVehicleIdAtStart &&
    round.image.vehicleId === round.session.featuredVehicleIdAtStart;

  // Survival-specific: derive multiplier from prior correct count and compute lives
  let survivalMultiplier: number | undefined;
  let livesRemaining: number | undefined;
  let rareFindBonus = 0;
  let survivalCorrectCount = 0;
  let isGameOver = false;

  if (mode === GameMode.Survival) {
    const [correctCount, wrongCount] = await Promise.all([
      prisma.guess.count({ where: { round: { gameId: round.gameId }, isCorrect: true } }),
      prisma.guess.count({ where: { round: { gameId: round.gameId }, isCorrect: false } }),
    ]);
    survivalCorrectCount = correctCount;
    survivalMultiplier = 1.0 + 0.1 * correctCount;

    if (isCorrect && (vehicle.rarity === "rare" || vehicle.rarity === "ultra_rare")) {
      rareFindBonus = DAILY_RARE_FIND_BONUS;
    }

    const newCorrect = correctCount + (isCorrect ? 1 : 0);
    const newWrong = wrongCount + (isCorrect ? 0 : 1);
    livesRemaining = 1 + Math.floor(newCorrect / 10) - newWrong;
    isGameOver = livesRemaining <= 0;
  }

  const scoring = scoreRound({
    makeCorrect: makeMatch,
    modelCorrect: modelMatch,
    yearDelta,
    elapsedMs: timeTakenMs ?? timeLimitMs,
    timeLimitMs,
    mode,
    panelsRevealed,
    isDailyDiscovery,
    overrideMultiplier: survivalMultiplier,
  });

  const proBonus = isCorrect ? round.proBonus : 0;
  const totalPointsEarned = scoring.pointsEarned + proBonus + rareFindBonus;
  const imageId = round.image.id;

  const guessData = {
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
    dailyDiscoveryBonus: scoring.dailyDiscoveryBonus,
    rareFindBonus,
    modeMultiplier: scoring.modeMultiplier,
    pointsEarned: totalPointsEarned,
  };

  let guess: { id: string };
  if (isGameOver) {
    const { _sum } = await prisma.guess.aggregate({
      where: { round: { gameId: round.gameId } },
      _sum: { pointsEarned: true },
    });
    const finalScore = (_sum.pointsEarned ?? 0) + totalPointsEarned;
    const survivalStreak = survivalCorrectCount + (isCorrect ? 1 : 0);
    const [createdGuess] = await prisma.$transaction([
      prisma.guess.create({ data: guessData }),
      prisma.gameSession.update({
        where: { id: round.gameId },
        data: { endedAt: new Date(), finalScore, survivalStreak },
      }),
    ]);
    guess = createdGuess as { id: string };
  } else {
    guess = await prisma.guess.create({ data: guessData });
  }

  after(() => {
    prisma.imageStats.findUnique({
      where: { imageId },
      select: { correctGuesses: true, incorrectGuesses: true },
    }).then((existing) => {
      const prevCorrect = existing?.correctGuesses ?? 0;
      const prevIncorrect = existing?.incorrectGuesses ?? 0;
      const newCorrect = prevCorrect + (isCorrect ? 1 : 0);
      const newIncorrect = prevIncorrect + (isCorrect ? 0 : 1);
      const newCorrectRatio = newCorrect + newIncorrect === 0 ? 1.0 : newCorrect / (newCorrect + newIncorrect);
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
      });
    });
  });

  const response = Response.json({
    guessId: guess.id,
    makeMatch,
    modelMatch,
    partialCredit,
    yearDelta,
    vehicle: { make: vehicle.make, model: vehicle.model, year: vehicle.year },
    ...scoring,
    proBonus,
    rareFindBonus,
    pointsEarned: totalPointsEarned,
    dailyDiscoveryAwarded: isDailyDiscovery,
    ...(mode === GameMode.Survival
      ? { survivalMultiplier, livesRemaining, gameOver: isGameOver }
      : {}),
  });

  if (isDailyDiscovery) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const existing = request.cookies.get("cotd_found_dates")?.value;
    const dates: string[] = existing ? JSON.parse(existing) : [];
    if (!dates.includes(todayStr)) {
      dates.unshift(todayStr);
      // Rolling 180-day window
      const trimmed = dates.slice(0, 180);
      // Expire at next UTC midnight
      const now = new Date();
      const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const secondsUntilMidnight = Math.floor((nextMidnight.getTime() - now.getTime()) / 1000);
      const isProduction = process.env.NODE_ENV === "production";
      response.headers.append(
        "Set-Cookie",
        `cotd_found_dates=${encodeURIComponent(JSON.stringify(trimmed))}; SameSite=Lax; Path=/; Max-Age=${secondsUntilMidnight}${isProduction ? "; Secure" : ""}`,
      );
    }
  }

  return response;
}
