// Server helpers for daily challenge generation and access control.

import { Prisma } from "../generated/prisma/client";
import { prisma } from "./prisma";
import type { DailyChallenge } from "../generated/prisma/client";
import { ROUNDS_PER_GAME } from "./constants";

export type GenerateResult = {
  created: DailyChallenge[];
  skipped: string[]; // YYYY-MM-DD dates that already had a challenge
};


// Picks ROUNDS_PER_GAME random active image IDs, optionally excluding a list of IDs.
export async function pickImageIdsForChallenge(
  count = ROUNDS_PER_GAME,
  excludeIds: string[] = []
): Promise<string[]> {
  const excludeFilter =
    excludeIds.length > 0
      ? Prisma.sql`AND NOT (id = ANY(ARRAY[${Prisma.join(excludeIds)}]::text[]))`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Image"
    WHERE "isActive" = true ${excludeFilter}
    ORDER BY RANDOM()
    LIMIT ${count}
  `;

  // Throw rather than returning a partial set — a short challenge would silently corrupt the game.
  if (rows.length < count) {
    throw new Error(
      `Not enough active images to generate a challenge (need ${count}, got ${rows.length})`
    );
  }

  return rows.map((row) => row.id);
}

// Creates one DailyChallenge per day in the given range, skipping dates that already have one.
// Returns the list of created challenges and the dates that were skipped.
export async function generateChallengesForRange(
  startDate: Date,
  endDate: Date
): Promise<GenerateResult> {
  const created: DailyChallenge[] = [];
  const skipped: string[] = [];

  // Normalise to UTC midnight so comparisons against DB DateTime values are timezone-safe.
  const start = normalizeToUtcMidnight(startDate);
  const end = normalizeToUtcMidnight(endDate);

  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    const daySnapshot = new Date(current);

    const existing = await prisma.dailyChallenge.findUnique({ where: { date: daySnapshot } });
    if (existing) {
      skipped.push(dateStr);
    } else {
      // Exclude yesterday's images so consecutive days don't share the same cars.
      const prevDay = new Date(daySnapshot);
      prevDay.setUTCDate(prevDay.getUTCDate() - 1);
      const prevChallenge = await prisma.dailyChallenge.findUnique({ where: { date: prevDay } });

      const imageIds = await pickImageIdsForChallenge(
        ROUNDS_PER_GAME,
        prevChallenge?.imageIds ?? []
      );

      const challenge = await prisma.dailyChallenge.create({
        data: {
          date: daySnapshot,
          imageIds,
          isPublished: true,
        },
      });
      created.push(challenge);
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return { created, skipped };
}

export function normalizeToUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function getChallengeByDate(dateStr: string): Promise<DailyChallenge | null> {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return prisma.dailyChallenge.findUnique({ where: { date } });
}

export async function getOrCreateTodaysChallenge(): Promise<DailyChallenge> {
  const today = normalizeToUtcMidnight(new Date());
  const dateStr = today.toISOString().slice(0, 10);

  const existing = await getChallengeByDate(dateStr);
  if (existing) return existing;

  const { created } = await generateChallengesForRange(today, today);
  if (created.length === 0) {
    // This could happen if another request created it between the findUnique and generate call
    const race = await getChallengeByDate(dateStr);
    if (!race) throw new Error("Failed to get or create daily challenge");
    return race;
  }
  return created[0];
}
