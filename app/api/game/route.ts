// API route for starting a new game session.
import type { NextRequest } from "next/server";
import type { Prisma } from "../../../app/generated/prisma/client";
import { prisma } from "@/app/lib/prisma";
import { shuffle, selectDistractors, vehicleLabel, imageUrl, TIME_LIMITS, type VehicleForDistractor } from "@/app/lib/game";
import { ROUNDS_PER_GAME, GameMode } from "@/app/lib/constants";
import { selectTieredImages } from "@/app/lib/image-selection";

const VALID_MODES = Object.values(GameMode);
type Mode = GameMode;

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

  if (mode === GameMode.Easy || mode === GameMode.Standard || mode === GameMode.Hardcore) {
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

  // Create session
  const sessionToken = crypto.randomUUID();
  const session = await prisma.gameSession.create({
    data: {
      mode,
      filterConfig: filterConfig as object,
      sessionToken,
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
      const distractors = selectDistractors(correct, vehiclePool);
      return shuffle([
        { vehicleId: correct.id, label: vehicleLabel(correct) },
        ...distractors.map((d) => ({ vehicleId: d.id, label: vehicleLabel(d) })),
      ]);
    });
  }

  const rounds = await prisma.$transaction(
    selected.map((image, i) =>
      prisma.round.create({
        data: {
          gameId: session.id,
          imageId: image.id,
          sequenceNumber: i + 1,
          easyChoices: precomputedChoices ? precomputedChoices[i].map((c) => c.vehicleId) : [],
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
  return response;
}
