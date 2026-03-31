import type { NextRequest } from "next/server";
import type { Prisma } from "../../../app/generated/prisma/client";
import { prisma } from "@/app/lib/prisma";
import { shuffle, selectDistractors, vehicleLabel, imageUrl, TIME_LIMITS } from "@/app/lib/game";

const VALID_MODES = ["easy", "medium", "hard", "hardcore", "competitive", "practice"] as const;
type Mode = (typeof VALID_MODES)[number];

interface FilterConfig {
  categorySlugs?: string[];
  regionSlugs?: string[];
  countries?: string[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("mode") as Mode | null;
  const username = searchParams.get("username") ?? null;
  const filterRaw = searchParams.get("filter");

  if (!mode || !VALID_MODES.includes(mode)) {
    return Response.json({ error: "Invalid or missing mode" }, { status: 400 });
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

  const imageWhere: Prisma.ImageWhereInput = {
    isActive: true,
    ...(mode === "hardcore" ? { isHardcoreEligible: true } : {}),
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

  // Build response rounds
  const roundData = selected.map((image, i) => ({
    roundId: rounds[i].id,
    sequenceNumber: i + 1,
    imageId: image.id,
    imageUrl: imageUrl(image.filename, image.vehicleId),
    vehicle: {
      make: image.vehicle.make,
      model: image.vehicle.model,
      year: image.vehicle.year,
    },
    vehicleId: image.vehicleId,
  }));

  // Easy and practice modes: generate 4 choices per round
  let easyChoices: Record<string, { vehicleId: string; label: string }[]> | undefined;
  if (mode === "easy" || mode === "practice") {
    // All vehicles for distractor pool
    const allVehicles = await prisma.vehicle.findMany({
      select: { id: true, make: true, model: true, era: true },
    });

    easyChoices = {};
    for (let i = 0; i < selected.length; i++) {
      const correct = selected[i].vehicle;
      const distractors = selectDistractors(correct, allVehicles);
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
