// Server helpers for daily challenge generation and access control.

import { Prisma } from "../generated/prisma/client";
import { prisma } from "./prisma";
import type { DailyChallenge } from "../generated/prisma/client";

// Daily challenges are always exactly 10 rounds regardless of the DAILY_CHALLENGE_ROUNDS env var.
const DAILY_CHALLENGE_ROUNDS = 10;

export type GenerateResult = {
  created: DailyChallenge[];
  skipped: string[]; // YYYY-MM-DD dates that already had a challenge
};


// Raw SQL is required here because Prisma's ORM layer doesn't expose ORDER BY RANDOM().
export async function pickImageIdsForChallenge(
  count = DAILY_CHALLENGE_ROUNDS,
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

export async function generateChallengesForRange(
  startDate: Date,
  endDate: Date
): Promise<GenerateResult> {
  const created: DailyChallenge[] = [];
  const skipped: string[] = [];

  const last = await prisma.dailyChallenge.findFirst({ orderBy: { challengeNumber: "desc" } });
  let nextChallengeNumber = (last?.challengeNumber ?? 0) + 1;

  // Normalise to UTC midnight so comparisons against DB DateTime values are timezone-safe.
  const start = new Date(
    Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())
  );
  const end = new Date(
    Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
  );

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
        DAILY_CHALLENGE_ROUNDS,
        prevChallenge?.imageIds ?? []
      );

      const challenge = await prisma.dailyChallenge.create({
        data: {
          challengeNumber: nextChallengeNumber++,
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
