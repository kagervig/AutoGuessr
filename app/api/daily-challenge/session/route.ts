// Endpoint for bootstrapping a daily challenge game session.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  shuffle,
  selectDistractors,
  vehicleLabel,
  imageUrl,
  type VehicleForDistractor,
} from "@/app/lib/game";
import {
  getOrCreateTodaysChallenge,
  getChallengeByDate,
} from "@/app/lib/daily-challenge";
import { getOrCreateTodaysFeatured } from "@/app/lib/car-of-the-day";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const dateParam = searchParams.get("date");
  const playerId = searchParams.get("playerId") ?? null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const targetDate = dateParam ?? todayStr;

  if (targetDate > todayStr) {
    return Response.json({ error: "This challenge is not yet available." }, { status: 403 });
  }

  const challenge =
    targetDate === todayStr
      ? await getOrCreateTodaysChallenge()
      : await getChallengeByDate(targetDate);

  if (!challenge) {
    return Response.json({ error: "Daily challenge not found for this date." }, { status: 404 });
  }

  if (playerId) {
    const existing = await prisma.dailyChallengeSession.findUnique({
      where: { playerId_challengeId: { playerId, challengeId: challenge.id } },
      select: { id: true },
    });
    if (existing) {
      return Response.json(
        { error: "You have already played this challenge.", existingSessionId: existing.id },
        { status: 403 }
      );
    }
  }

  const [images, featured, allVehicles] = await Promise.all([
    prisma.image.findMany({
      where: { id: { in: challenge.imageIds } },
      select: {
        id: true,
        filename: true,
        vehicleId: true,
        isHardcoreEligible: true,
        transformationSignature: true,
        cropMethod: true,
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            era: true,
            rarity: true,
            categories: { select: { category: { select: { slug: true } } } },
          },
        },
      },
    }),
    getOrCreateTodaysFeatured().catch(() => null),
    prisma.vehicle.findMany({
      select: {
        id: true,
        make: true,
        model: true,
        era: true,
        categories: { select: { category: { select: { slug: true } } } },
      },
    }),
  ]);

  const cotdVehicleId = featured?.vehicleId ?? null;

  const imageMap = new Map(images.map((img) => [img.id, img]));
  const orderedImages = challenge.imageIds
    .map((id) => imageMap.get(id))
    .filter((img): img is NonNullable<typeof img> => !!img);

  const vehiclePool: VehicleForDistractor[] = allVehicles.map((v) => ({
    ...v,
    categorySlugs: v.categories.map((c) => c.category.slug),
  }));
  const vehicleMap = new Map(vehiclePool.map((v) => [v.id, v]));

  const rounds = orderedImages.map((image, i) => {
    const vehicle = image.vehicle;
    const correct: VehicleForDistractor = vehicleMap.get(vehicle.id) ?? {
      ...vehicle,
      categorySlugs: [],
    };
    const distractors = selectDistractors(correct, vehiclePool, 3);
    const choices = shuffle([
      { vehicleId: correct.id, label: vehicleLabel(correct) },
      ...distractors.map((d) => ({ vehicleId: d.id, label: vehicleLabel(d) })),
    ]);

    return {
      roundIndex: i,
      imageUrl: imageUrl(image.filename, image.vehicleId, image.transformationSignature, image.cropMethod),
      distractors: choices,
      bonusFlags: {
        isHardcore: image.isHardcoreEligible,
        isCotd: vehicle.id === cotdVehicleId,
        isRareFind: vehicle.rarity === "rare" || vehicle.rarity === "ultra_rare",
      },
    };
  });

  const sessionId = crypto.randomUUID();
  await prisma.dailyChallengeSession.create({
    data: {
      id: sessionId,
      playerId,
      challengeId: challenge.id,
      answerVehicleIds: orderedImages.map((img) => img.vehicleId),
      roundBonuses: rounds.map((r) => r.bonusFlags),
      roundScores: [],
    },
  });

  return Response.json({ sessionId, rounds });
}
