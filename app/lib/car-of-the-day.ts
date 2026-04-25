// Selection logic and helpers for the Car of the Day feature.
import { prisma } from "./prisma";
import type { FeaturedVehicleOfDay, Image, Vehicle, VehicleTrivia } from "../generated/prisma/client";

export type FeaturedWithRelations = FeaturedVehicleOfDay & {
  vehicle: Pick<Vehicle, "id" | "make" | "model"> & {
    trivia: VehicleTrivia | null;
  };
  image: Pick<Image, "id" | "filename">;
};

const VEHICLE_INCLUDE = {
  vehicle: {
    select: {
      id: true,
      make: true,
      model: true,
      trivia: true,
    },
  },
  image: { select: { id: true, filename: true } },
} as const;

export function getTodayUTCMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// FNV-1a 32-bit hash of a string — stable and fast for deterministic picking
function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

export async function getFeatured(date?: Date): Promise<FeaturedWithRelations | null> {
  const target = date ?? getTodayUTCMidnight();
  return prisma.featuredVehicleOfDay.findUnique({
    where: { date: target },
    include: VEHICLE_INCLUDE,
  }) as Promise<FeaturedWithRelations | null>;
}

export async function selectAndInsertFeatured(date: Date): Promise<FeaturedWithRelations> {
  const dateStr = date.toISOString().slice(0, 10);

  // Pool: vehicles with trivia, at least one active image, not featured in last 60 days
  const cutoff = new Date(date);
  cutoff.setUTCDate(cutoff.getUTCDate() - 60);

  const recentlyFeaturedIds = await prisma.featuredVehicleOfDay
    .findMany({
      where: { date: { gte: cutoff, lt: date } },
      select: { vehicleId: true },
    })
    .then((rows) => rows.map((r) => r.vehicleId));

  const pool = await prisma.vehicle.findMany({
    where: {
      trivia: { isNot: null },
      images: { some: { isActive: true } },
      id: { notIn: recentlyFeaturedIds },
    },
    select: {
      id: true,
      make: true,
      model: true,
      images: {
        where: { isActive: true },
        select: { id: true, filename: true, isCropped: true, isLogoVisible: true },
      },
    },
    orderBy: { id: "asc" },
  });

  if (pool.length === 0) {
    const [withTrivia, withActiveImage] = await Promise.all([
      prisma.vehicle.count({ where: { trivia: { isNot: null } } }),
      prisma.vehicle.count({ where: { images: { some: { isActive: true } } } }),
    ]);
    throw new Error(
      `No eligible vehicles for ${dateStr}: ${withTrivia} have trivia, ${withActiveImage} have active images, ${recentlyFeaturedIds.length} excluded by 60-day cooldown`
    );
  }

  const vehicleIndex = fnv1a(dateStr) % pool.length;
  const chosen = pool[vehicleIndex];

  // Prefer uncropped images with logo visible for recognisability on the card
  const preferred = chosen.images.filter((img) => !img.isCropped && img.isLogoVisible);
  const imagePool = preferred.length > 0 ? preferred : chosen.images;
  const imageIndex = fnv1a(dateStr + chosen.id) % imagePool.length;
  const chosenImage = imagePool[imageIndex];

  const featured = await prisma.featuredVehicleOfDay.create({
    data: {
      date,
      vehicleId: chosen.id,
      imageId: chosenImage.id,
    },
    include: VEHICLE_INCLUDE,
  });

  return featured as FeaturedWithRelations;
}

const COTD_COOLDOWN_DAYS = 365;

export async function getEligiblePool(additionalExclusions: string[] = []) {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - COTD_COOLDOWN_DAYS);

  const allFeaturedIds = await prisma.featuredVehicleOfDay
    .findMany({ where: { date: { gte: cutoff } }, select: { vehicleId: true } })
    .then((rows) => rows.map((r) => r.vehicleId));

  const excludeIds = [...new Set([...allFeaturedIds, ...additionalExclusions])];

  return prisma.vehicle.findMany({
    where: {
      trivia: { isNot: null },
      images: { some: { isActive: true } },
      id: { notIn: excludeIds },
    },
    select: {
      id: true,
      make: true,
      model: true,
      images: {
        where: { isActive: true },
        select: { id: true, filename: true, isCropped: true, isLogoVisible: true },
        take: 1,
        orderBy: [{ isLogoVisible: "desc" }, { isCropped: "asc" }],
      },
    },
    orderBy: [{ make: "asc" }, { model: "asc" }],
  });
}

export async function rerollFeatured(date: Date): Promise<FeaturedWithRelations> {
  const existing = await prisma.featuredVehicleOfDay.findUnique({ where: { date } });
  const pool = await getEligiblePool(existing?.vehicleId ? [existing.vehicleId] : []);

  if (pool.length === 0) {
    throw new Error("No eligible vehicles remaining for re-roll");
  }

  const chosen = pool[Math.floor(Math.random() * pool.length)];
  const preferred = chosen.images.filter((img) => !img.isCropped && img.isLogoVisible);
  const imagePool = preferred.length > 0 ? preferred : chosen.images;
  const chosenImage = imagePool[Math.floor(Math.random() * imagePool.length)];

  const featured = await prisma.featuredVehicleOfDay.upsert({
    where: { date },
    update: { vehicleId: chosen.id, imageId: chosenImage.id, curatedBy: "reroll" },
    create: { date, vehicleId: chosen.id, imageId: chosenImage.id, curatedBy: "reroll" },
    include: VEHICLE_INCLUDE,
  });

  return featured as FeaturedWithRelations;
}

export async function getOrCreateTodaysFeatured(): Promise<FeaturedWithRelations> {
  const today = getTodayUTCMidnight();
  const existing = await getFeatured(today);
  if (existing) return existing;
  return selectAndInsertFeatured(today);
}
