// Route for fetching the next round in a survival mode session.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { selectDistractors, vehicleLabel, imageUrl, proLevelBonus, shuffle, type VehicleForDistractor } from "@/app/lib/game";
import { selectSurvivalImage } from "@/app/lib/image-selection";
import { isFeatureEnabled } from "@/app/lib/feature-flags-server";
import { FEATURE_FLAG_KEY } from "@/app/lib/feature-flags";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const gameId = searchParams.get("gameId");

  if (!gameId) {
    return Response.json({ error: "Missing gameId" }, { status: 400 });
  }

  const cookie = request.cookies.get(`st_${gameId}`);
  if (!cookie) {
    return Response.json({ error: "Session expired or invalid" }, { status: 401 });
  }

  const enabled = await isFeatureEnabled(FEATURE_FLAG_KEY.ModeSurvival);
  if (!enabled) {
    return Response.json({ error: "Survival mode is not available" }, { status: 403 });
  }

  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    select: { id: true, sessionToken: true, endedAt: true },
  });

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.sessionToken !== cookie.value) {
    return Response.json({ error: "Session expired or invalid" }, { status: 401 });
  }

  if (session.endedAt) {
    return Response.json({ error: "Session has already ended" }, { status: 403 });
  }

  const priorRounds = await prisma.round.findMany({
    where: { gameId },
    include: { image: { select: { vehicleId: true } } },
    orderBy: { sequenceNumber: "asc" },
  });

  const sequenceNumber = priorRounds.length + 1;
  const usedVehicleIds = priorRounds.map((r) => r.image.vehicleId);

  const image = await selectSurvivalImage(sequenceNumber, usedVehicleIds);

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

  const correct = vehicleMap.get(image.vehicleId) ?? {
    id: image.vehicleId,
    make: image.vehicle.make,
    model: image.vehicle.model,
    era: image.vehicle.era,
    categorySlugs: [],
  } as VehicleForDistractor;

  const distractors = selectDistractors(correct, vehiclePool, 3);
  const choices = shuffle([
    { vehicleId: correct.id, label: vehicleLabel(correct) },
    ...distractors.map((d) => ({ vehicleId: d.id, label: vehicleLabel(d) })),
  ]);

  const imageStats = await prisma.imageStats.findFirst({
    where: { imageId: image.id },
    select: { correctGuesses: true, incorrectGuesses: true },
  });
  const proBonus = imageStats ? proLevelBonus(imageStats.correctGuesses, imageStats.incorrectGuesses) : 0;

  const round = await prisma.round.create({
    data: {
      gameId,
      imageId: image.id,
      sequenceNumber,
      easyChoices: choices.map((c) => c.vehicleId),
      timeLimitMs: null,
      proBonus,
    },
  });

  const isProduction = process.env.NODE_ENV === "production";
  const response = Response.json({
    roundId: round.id,
    sequenceNumber,
    imageId: image.id,
    imageUrl: imageUrl(image.filename, image.vehicleId),
    easyChoices: { [round.id]: choices },
    proBonus,
  });

  response.headers.set(
    "Set-Cookie",
    `st_${gameId}=${session.sessionToken}; HttpOnly; SameSite=Strict; Max-Age=1200; Path=/${isProduction ? "; Secure" : ""}`,
  );

  return response;
}
