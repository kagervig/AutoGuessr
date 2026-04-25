// Daily challenge helpers: generation, fetching, and resolving today's challenge.

import type { DailyChallenge } from "../generated/prisma/client";
import { prisma } from "./prisma";
import { DAILY_CHALLENGE_ORIGIN } from "./constants";
import { deriveMetrics, pickWeighted } from "./image-selection";
import type { ScoredImage } from "./image-selection";
import { shuffle } from "./game";

const RECENT_EXCLUSION_DAYS = 30;
const MIN_CORRECT_RATIO = 0.15;
const MAX_CORRECT_RATIO = 0.65;
const HARDCORE_ELIGIBLE_TARGET = 2;
const DAILY_CHALLENGE_SIZE = 10;

// Minimum picks per era; sums to 10.
const ERA_MIN_PICKS: Record<string, number> = {
  classic: 3,
  retro: 3,
  modern: 2,
  contemporary: 2,
};

export function getTodayUTCMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function getChallengeNumber(date: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((date.getTime() - DAILY_CHALLENGE_ORIGIN.getTime()) / msPerDay) + 1;
}

export async function getDailyChallenge(date?: Date): Promise<DailyChallenge | null> {
  const target = date ?? getTodayUTCMidnight();
  return prisma.dailyChallenge.findUnique({ where: { date: target } });
}

export async function getOrCreateTodaysChallenge(): Promise<DailyChallenge> {
  const today = getTodayUTCMidnight();
  const existing = await getDailyChallenge(today);
  return existing ?? generateDailyChallenge(today);
}

export async function generateDailyChallenge(date: Date): Promise<DailyChallenge> {
  const challengeNumber = getChallengeNumber(date);

  const cutoff = new Date(date.getTime() - RECENT_EXCLUSION_DAYS * 24 * 60 * 60 * 1000);
  const recentChallenges = await prisma.dailyChallenge.findMany({
    where: { date: { gte: cutoff } },
    select: { imageIds: true },
  });
  const recentlyUsedIds = new Set(recentChallenges.flatMap((c) => c.imageIds));

  const pool = await fetchEligiblePool([...recentlyUsedIds]);

  const midPool = pool.filter(
    (img) => img.totalServes === 0 || (img.correctRatio >= MIN_CORRECT_RATIO && img.correctRatio <= MAX_CORRECT_RATIO)
  );
  const workingPool = midPool.length >= DAILY_CHALLENGE_SIZE ? midPool : pool;

  const selected: ScoredImage[] = [];

  for (const [era, count] of Object.entries(ERA_MIN_PICKS)) {
    const eraPool = excludingByVehicle(
      workingPool.filter((img) => img.vehicle.era === era),
      selected
    );
    selected.push(...pickWeighted(eraPool, count));
  }

  // Fill remaining slots from any era.
  if (selected.length < DAILY_CHALLENGE_SIZE) {
    selected.push(...pickWeighted(excludingByVehicle(workingPool, selected), DAILY_CHALLENGE_SIZE - selected.length));
  }

  // Soft target: ensure at least HARDCORE_ELIGIBLE_TARGET hardcore-eligible images.
  const hardcoreCount = selected.filter((img) => img.isHardcoreEligible).length;
  if (hardcoreCount < HARDCORE_ELIGIBLE_TARGET) {
    const needed = HARDCORE_ELIGIBLE_TARGET - hardcoreCount;
    const replacements = pickWeighted(
      excludingByVehicle(workingPool.filter((img) => img.isHardcoreEligible), selected),
      needed
    );
    const nonHardcore = selected
      .filter((img) => !img.isHardcoreEligible)
      .sort((a, b) => a.selectionWeight - b.selectionWeight);
    for (let i = 0; i < Math.min(replacements.length, nonHardcore.length); i++) {
      const idx = selected.indexOf(nonHardcore[i]);
      if (idx !== -1) selected.splice(idx, 1, replacements[i]);
    }
  }

  // Fallback: fill any remaining gaps from the full pool ignoring difficulty constraints.
  if (selected.length < DAILY_CHALLENGE_SIZE) {
    selected.push(...pickWeighted(excludingByVehicle(pool, selected), DAILY_CHALLENGE_SIZE - selected.length));
  }

  if (selected.length < DAILY_CHALLENGE_SIZE) {
    throw new Error(`Not enough images to generate daily challenge #${challengeNumber}`);
  }

  const imageIds = (shuffle(selected) as ScoredImage[]).map((img) => img.id);

  return prisma.dailyChallenge.create({
    data: { challengeNumber, date, imageIds, isPublished: false },
  });
}

export async function selectReplacementImage(
  challenge: DailyChallenge,
  slotIndex: number
): Promise<string> {
  // Exclude all images already in the challenge
  const pool = await fetchEligiblePool(challenge.imageIds);

  // Exclude vehicles already in the other slots
  const otherImageIds = challenge.imageIds.filter((_, i) => i !== slotIndex);
  const otherImages = await prisma.image.findMany({
    where: { id: { in: otherImageIds } },
    select: { vehicleId: true },
  });
  const excludedVehicleIds = new Set(otherImages.map((img) => img.vehicleId));
  const eligible = pool.filter((img) => !excludedVehicleIds.has(img.vehicleId));

  const midPool = eligible.filter(
    (img) => img.totalServes === 0 || (img.correctRatio >= MIN_CORRECT_RATIO && img.correctRatio <= MAX_CORRECT_RATIO)
  );
  const workingPool = midPool.length > 0 ? midPool : eligible;

  const picks = pickWeighted(workingPool, 1);
  if (picks.length === 0) {
    throw new Error("No eligible replacement images found");
  }
  return picks[0].id;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function excludingByVehicle(pool: ScoredImage[], selected: ScoredImage[]): ScoredImage[] {
  const vehicleIds = new Set(selected.map((img) => img.vehicleId));
  return pool.filter((img) => !vehicleIds.has(img.vehicleId));
}

async function fetchEligiblePool(excludeImageIds: string[]): Promise<ScoredImage[]> {
  const raw = await prisma.image.findMany({
    where: {
      isActive: true,
      ...(excludeImageIds.length > 0 && { id: { notIn: excludeImageIds } }),
    },
    include: {
      vehicle: {
        select: { id: true, make: true, model: true, year: true, era: true, rarity: true },
      },
      stats: {
        select: { totalServes: true, correctRatio: true, thumbsUp: true },
      },
    },
  });

  return deriveMetrics(
    raw.map((img) => ({
      id: img.id,
      filename: img.filename,
      vehicleId: img.vehicleId,
      isCropped: img.isCropped,
      isLogoVisible: img.isLogoVisible,
      isModelNameVisible: img.isModelNameVisible,
      isHardcoreEligible: img.isHardcoreEligible,
      vehicle: {
        id: img.vehicle.id,
        make: img.vehicle.make,
        model: img.vehicle.model,
        year: img.vehicle.year,
        era: img.vehicle.era as string,
        rarity: img.vehicle.rarity as string,
      },
      stats: img.stats
        ? {
            totalServes: img.stats.totalServes,
            correctRatio: img.stats.correctRatio,
            thumbsUp: img.stats.thumbsUp,
          }
        : null,
    }))
  );
}
