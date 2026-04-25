// API route for starting a new game session.
import type { NextRequest } from "next/server";
import type { Prisma } from "../../../app/generated/prisma/client";
import { prisma } from "@/app/lib/prisma";
import { shuffle, selectDistractors, vehicleLabel, imageUrl, TIME_LIMITS, proLevelBonus, type VehicleForDistractor } from "@/app/lib/game";
import { ROUNDS_PER_GAME, GameMode } from "@/app/lib/constants";
import { selectTieredImages } from "@/app/lib/image-selection";
import { getOrCreateTodaysFeatured } from "@/app/lib/car-of-the-day";
import { getOrCreateTodaysChallenge, getDailyChallenge } from "@/app/lib/daily-challenge";
import type { DailyChallenge } from "@/app/generated/prisma/client";
import { FEATURE_FLAG_KEY, GAME_MODE_FLAG } from "@/app/lib/feature-flags";
import { getFeatureFlagMap } from "@/app/lib/feature-flags-server";

const VALID_MODES = Object.values(GameMode);
type Mode = GameMode;

interface FilterConfig {
  categorySlugs?: string[];
  regionSlugs?: string[];
  countries?: string[];
  makes?: string[];
}

async function verifyTurnstile(token: string): Promise<boolean> {
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: token }),
  });
  const data = await res.json();
  return data.success === true;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  let mode = searchParams.get("mode") as Mode | null;
  const filterRaw = searchParams.get("filter");
  const cfToken = searchParams.get("cf_token");
  const daily = searchParams.get("daily") === "true";

  if (!daily && (!mode || !VALID_MODES.includes(mode))) {
    return Response.json({ error: "Invalid or missing mode" }, { status: 400 });
  }

  const flags = await getFeatureFlagMap();
  if (daily && !flags[FEATURE_FLAG_KEY.DailyChallenge]) {
    return Response.json({ error: "Daily challenge is currently disabled" }, { status: 403 });
  }
  if (!daily && mode && !flags[GAME_MODE_FLAG[mode]]) {
    return Response.json({ error: "This game mode is currently disabled" }, { status: 403 });
  }

  if (process.env.NODE_ENV === "production" && process.env.TURNSTILE_SECRET_KEY) {
    if (!cfToken) {
      return Response.json({ error: "Bot check required" }, { status: 403 });
    }
    const ok = await verifyTurnstile(cfToken);
    if (!ok) {
      return Response.json({ error: "Bot check failed" }, { status: 403 });
    }
  }

  const filterConfig: FilterConfig = filterRaw
    ? JSON.parse(decodeURIComponent(filterRaw))
    : {};

  // Build vehicle filter — AND across dimensions, OR within each dimension
  const vehicleFilters: Prisma.VehicleWhereInput[] = [];
  if (filterConfig.categorySlugs?.length) {
    vehicleFilters.push({
      categories: { some: { category: { slug: { in: filterConfig.categorySlugs } } } },
    });
  }
  if (filterConfig.regionSlugs?.length) {
    vehicleFilters.push({ region: { slug: { in: filterConfig.regionSlugs } } });
  }
  if (filterConfig.countries?.length) {
    vehicleFilters.push({ countryOfOrigin: { in: filterConfig.countries } });
  }
  if (filterConfig.makes?.length) {
    vehicleFilters.push({ make: { in: filterConfig.makes } });
  }

  // Minimal image shape shared by both the tiered and non-tiered selection paths
  type SelectableImage = {
    id: string;
    filename: string;
    vehicleId: string;
    vehicle: { id: string; make: string; model: string; year: number; era: string };
    pointsBonus?: true;
  };

  let selected: SelectableImage[];
  let makes: string[] | undefined;
  let dailyChallengeId: string | undefined;
  let dailyChallengeNumber: number | undefined;

  if (daily) {
    const dailyDateParam = searchParams.get("dailyDate");
    let challenge: DailyChallenge;

    if (dailyDateParam) {
      // Archive game — look up by date, no replay prevention
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dailyDateParam)) {
        return Response.json({ error: "Invalid dailyDate format" }, { status: 400 });
      }
      const archiveDate = new Date(`${dailyDateParam}T00:00:00.000Z`);
      const found = await getDailyChallenge(archiveDate);
      if (!found || !found.isPublished) {
        return Response.json({ error: "Challenge not found" }, { status: 404 });
      }
      challenge = found;
    } else {
      // Today's challenge — enforce publish gate and replay prevention
      challenge = await getOrCreateTodaysChallenge();
      if (!challenge.isPublished) {
        return Response.json({ error: "Today's challenge is not yet available" }, { status: 404 });
      }
      const existingSessionId = request.cookies.get(`dc_${challenge.challengeNumber}`)?.value;
      if (existingSessionId) {
        const existingSession = await prisma.gameSession.findUnique({
          where: { id: existingSessionId },
          select: { id: true, endedAt: true },
        });
        if (existingSession?.endedAt) {
          return Response.json(
            { error: "Already played today's challenge", sessionId: existingSession.id },
            { status: 409 }
          );
        }
      }
      dailyChallengeNumber = challenge.challengeNumber;
    }

    dailyChallengeId = challenge.id;
    mode = GameMode.Easy;

    const images = await prisma.image.findMany({
      where: { id: { in: challenge.imageIds } },
      include: {
        vehicle: { select: { id: true, make: true, model: true, year: true, era: true } },
      },
    });
    const imageMap = new Map(images.map((img) => [img.id, img]));
    selected = challenge.imageIds
      .map((id) => imageMap.get(id))
      .filter((img): img is NonNullable<typeof img> => img !== undefined);
  } else if (mode === GameMode.Easy || mode === GameMode.Standard || mode === GameMode.Hardcore) {
    try {
      if (mode === GameMode.Easy) {
        selected = await selectTieredImages(mode, vehicleFilters);
      } else {
        [selected, makes] = await Promise.all([
          selectTieredImages(mode, vehicleFilters),
          prisma.vehicle
            .findMany({ select: { make: true }, distinct: ["make"], orderBy: { make: "asc" } })
            .then((rows) => rows.map((v) => v.make)),
        ]);
      }
    } catch {
      return Response.json(
        { error: "Not enough cars match this filter. Try broadening your selection." },
        { status: 400 }
      );
    }
  } else {
    // custom, practice, time_attack: existing shuffle-and-slice path
    const imageWhere: Prisma.ImageWhereInput = {
      isActive: true,
      ...(vehicleFilters.length ? { vehicle: { AND: vehicleFilters } } : {}),
    };

    const allImages = await prisma.image.findMany({
      where: imageWhere,
      include: {
        vehicle: {
          select: { id: true, make: true, model: true, year: true, era: true },
        },
      },
      orderBy: { uploadedAt: "desc" },
    });

    if (allImages.length < 4) {
      return Response.json(
        { error: "Not enough cars match this filter. Try broadening your selection." },
        { status: 400 }
      );
    }

    selected = shuffle(allImages).slice(0, ROUNDS_PER_GAME);

    if (mode === GameMode.Custom || mode === GameMode.TimeAttack) {
      const distinctMakes = await prisma.vehicle.findMany({
        select: { make: true },
        distinct: ["make"],
        orderBy: { make: "asc" },
      });
      makes = distinctMakes.map((v) => v.make);
    }
  }

  // Snapshot the current Car of the Day so mid-midnight sessions can't farm two bonuses
  let featuredVehicleIdAtStart: string | null = null;
  try {
    const featured = await getOrCreateTodaysFeatured();
    featuredVehicleIdAtStart = featured.vehicleId;
  } catch {
    // No eligible featured vehicle — bonus simply won't fire this session
  }

  // Create session
  const sessionToken = crypto.randomUUID();
  const session = await prisma.gameSession.create({
    data: {
      mode: mode!,
      filterConfig: filterConfig as object,
      sessionToken,
      featuredVehicleIdAtStart,
      ...(dailyChallengeId ? { dailyChallengeId } : {}),
    },
  });

  // Create rounds
  const timeLimitMs = mode === GameMode.TimeAttack ? TIME_LIMITS[GameMode.TimeAttack] : null;

  // Easy mode: pre-compute distractor choices before the transaction to avoid per-round updates
  let precomputedChoices: { vehicleId: string; label: string }[][] | undefined;
  if (mode === GameMode.Easy) {
    const allVehicles = await prisma.vehicle.findMany({
      select: {
        id: true,
        make: true,
        model: true,
        era: true,
        categories: { select: { category: { select: { slug: true } } } },
      },
    });
    const vehiclePool: VehicleForDistractor[] = allVehicles.map((v) => ({
      ...v,
      categorySlugs: v.categories.map((c) => c.category.slug),
    }));
    const vehicleMap = new Map(vehiclePool.map((v) => [v.id, v]));
    precomputedChoices = selected.map((image) => {
      const correct = vehicleMap.get(image.vehicle.id) ?? { ...image.vehicle, categorySlugs: [] } as VehicleForDistractor;
      const distractors = selectDistractors(correct, vehiclePool, 3, filterConfig.makes);
      return shuffle([
        { vehicleId: correct.id, label: vehicleLabel(correct) },
        ...distractors.map((d) => ({ vehicleId: d.id, label: vehicleLabel(d) })),
      ]);
    });
  }

  const selectedImageIds = selected.map((img) => img.id);
  const imageStatsList = await prisma.imageStats.findMany({
    where: { imageId: { in: selectedImageIds } },
    select: { imageId: true, correctGuesses: true, incorrectGuesses: true },
  });
  const imageStatsMap = new Map(imageStatsList.map((s) => [s.imageId, s]));

  const rounds = await prisma.$transaction(
    selected.map((image, i) => {
      const stats = imageStatsMap.get(image.id);
      const roundProBonus = stats ? proLevelBonus(stats.correctGuesses, stats.incorrectGuesses) : 0;
      return prisma.round.create({
        data: {
          gameId: session.id,
          imageId: image.id,
          sequenceNumber: i + 1,
          easyChoices: precomputedChoices ? precomputedChoices[i].map((c) => c.vehicleId) : [],
          timeLimitMs,
          proBonus: roundProBonus,
        },
      });
    })
  );

  // Build response rounds — vehicle identity is intentionally omitted to prevent client-side cheating
  const roundData = selected.map((image, i) => ({
    roundId: rounds[i].id,
    sequenceNumber: i + 1,
    imageId: image.id,
    imageUrl: imageUrl(image.filename, image.vehicleId),
    ...(image.pointsBonus ? { pointsBonus: true } : {}),
  }));

  // Easy mode: build easyChoices response from pre-computed choices
  let easyChoices: Record<string, { vehicleId: string; label: string }[]> | undefined;
  if (mode === GameMode.Easy && precomputedChoices) {
    easyChoices = Object.fromEntries(rounds.map((round, i) => [round.id, precomputedChoices![i]]));
  }

  // Practice mode: generate and persist 4 choices per round
  if (mode === GameMode.Practice) {
    const allVehicles = await prisma.vehicle.findMany({
      select: {
        id: true,
        make: true,
        model: true,
        era: true,
        categories: { select: { category: { select: { slug: true } } } },
      },
    });
    const vehiclePool: VehicleForDistractor[] = allVehicles.map((v) => ({
      ...v,
      categorySlugs: v.categories.map((c) => c.category.slug),
    }));
    const vehicleMap = new Map(vehiclePool.map((v) => [v.id, v]));

    easyChoices = {};
    for (let i = 0; i < selected.length; i++) {
      const correct = vehicleMap.get(selected[i].vehicle.id) ?? { ...selected[i].vehicle, categorySlugs: [] } as VehicleForDistractor;
      const distractors = selectDistractors(correct, vehiclePool, 3, filterConfig.makes);
      const choices = shuffle([
        { vehicleId: correct.id, label: vehicleLabel(correct) },
        ...distractors.map((d) => ({ vehicleId: d.id, label: vehicleLabel(d) })),
      ]);

      // Persist choices on the round
      await prisma.round.update({
        where: { id: rounds[i].id },
        data: { easyChoices: choices.map((c) => c.vehicleId) },
      });

      easyChoices[rounds[i].id] = choices;
    }
  }

  const isProduction = process.env.NODE_ENV === "production";
  const response = Response.json({
    gameId: session.id,
    rounds: roundData,
    ...(easyChoices ? { easyChoices } : {}),
    ...(makes ? { makes } : {}),
    ...(mode === GameMode.TimeAttack ? { timeLimitMs: TIME_LIMITS[GameMode.TimeAttack] } : {}),
  });
  response.headers.set(
    "Set-Cookie",
    `st_${session.id}=${sessionToken}; HttpOnly; SameSite=Strict; Max-Age=1200; Path=/${isProduction ? "; Secure" : ""}`,
  );
  if (dailyChallengeNumber !== undefined) {
    // Expires at next UTC midnight so the cookie is scoped to today's challenge
    const now = new Date();
    const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const secondsUntilMidnight = Math.floor((nextMidnight.getTime() - now.getTime()) / 1000);
    response.headers.append(
      "Set-Cookie",
      `dc_${dailyChallengeNumber}=${session.id}; HttpOnly; SameSite=Strict; Max-Age=${secondsUntilMidnight}; Path=/${isProduction ? "; Secure" : ""}`,
    );
  }
  return response;
}
