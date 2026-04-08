import type { NextRequest } from "next/server";
import type { Prisma } from "../../../app/generated/prisma/client";
import { prisma } from "@/app/lib/prisma";
import { shuffle, selectDistractors, vehicleLabel, imageUrl, TIME_LIMITS, type VehicleForDistractor } from "@/app/lib/game";

const VALID_MODES = ["easy", "medium", "hard", "hardcore", "competitive", "practice"] as const;
type Mode = (typeof VALID_MODES)[number];

interface FilterConfig {
  categorySlugs?: string[];
  regionSlugs?: string[];
  countries?: string[];
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
  const mode = searchParams.get("mode") as Mode | null;
  const username = searchParams.get("username") ?? null;
  const filterRaw = searchParams.get("filter");
  const cfToken = searchParams.get("cf_token");

  if (!mode || !VALID_MODES.includes(mode)) {
    return Response.json({ error: "Invalid or missing mode" }, { status: 400 });
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

  // For hardcore: eligible images OR images players rarely get right.
  // Minimum 5 plays required before a low-ratio image qualifies.
  const LOW_SUCCESS_RATIO = 0.40;
  const MIN_PLAYS = 5;
  let hardcoreImageIds: string[] | undefined;
  if (mode === "hardcore") {
    const allStats = await prisma.imageStats.findMany({
      select: { imageId: true, correctGuesses: true, incorrectGuesses: true },
    });
    hardcoreImageIds = allStats
      .filter((s) => {
        const total = s.correctGuesses + s.incorrectGuesses;
        return total >= MIN_PLAYS && s.correctGuesses / total < LOW_SUCCESS_RATIO;
      })
      .map((s) => s.imageId);
  }

  const imageWhere: Prisma.ImageWhereInput = {
    isActive: true,
    ...(mode === "hardcore"
      ? {
          OR: [
            { isHardcoreEligible: true },
            { id: { in: hardcoreImageIds } },
          ],
        }
      : {}),
    ...(vehicleFilters.length
      ? { vehicle: { AND: vehicleFilters } }
      : {}),
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

  const selected = shuffle(allImages).slice(0, 10);

  // Upsert player if username provided
  let playerId: string | null = null;
  if (username) {
    const player = await prisma.player.upsert({
      where: { username },
      update: { lastSeenAt: new Date() },
      create: {
        username,
        stats: { create: {} },
      },
    });
    playerId = player.id;
  }

  // Create session
  const session = await prisma.gameSession.create({
    data: {
      playerId,
      mode,
      filterConfig: filterConfig as object,
    },
  });

  // Create rounds
  const timeLimitMs = mode === "competitive" ? TIME_LIMITS.competitive : null;

  const rounds = await prisma.$transaction(
    selected.map((image, i) =>
      prisma.round.create({
        data: {
          sessionId: session.id,
          imageId: image.id,
          sequenceNumber: i + 1,
          easyChoices: [],
          timeLimitMs,
        },
      })
    )
  );

  // Build response rounds — vehicle identity is intentionally omitted to prevent client-side cheating
  const roundData = selected.map((image, i) => ({
    roundId: rounds[i].id,
    sequenceNumber: i + 1,
    imageId: image.id,
    imageUrl: imageUrl(image.filename, image.vehicleId),
  }));

  // Easy and practice modes: generate 4 choices per round
  let easyChoices: Record<string, { vehicleId: string; label: string }[]> | undefined;
  if (mode === "easy" || mode === "practice") {
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
      const correct = vehicleMap.get(selected[i].vehicle.id) ?? { ...selected[i].vehicle, categorySlugs: [] };
      const distractors = selectDistractors(correct, vehiclePool);
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

  // Medium/hard/hardcore/competitive: return distinct makes
  let makes: string[] | undefined;
  if (["medium", "hard", "hardcore", "competitive"].includes(mode)) {
    const distinctMakes = await prisma.vehicle.findMany({
      select: { make: true },
      distinct: ["make"],
      orderBy: { make: "asc" },
    });
    makes = distinctMakes.map((v) => v.make);
  }

  return Response.json({
    sessionId: session.id,
    rounds: roundData,
    ...(easyChoices ? { easyChoices } : {}),
    ...(makes ? { makes } : {}),
    ...(mode === "competitive" ? { timeLimitMs: TIME_LIMITS.competitive } : {}),
  });
}
