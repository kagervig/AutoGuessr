// GET /api/daily-challenge/history — per-day played/score/rank for a player across a calendar month.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

type HistoryRow = {
  challengeId: number;
  date: Date;
  totalScore: number | null;
  completedAt: Date | null;
  rank: bigint | null;
  totalPlayers: bigint | null;
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const monthParam = searchParams.get("month");
  const playerId = searchParams.get("playerId") ?? null;

  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    return Response.json(
      { error: "month parameter is required in YYYY-MM format" },
      { status: 400 }
    );
  }

  const [year, month] = monthParam.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const rows = await prisma.$queryRaw<HistoryRow[]>`
    WITH completions AS (
      SELECT
        "playerId",
        "challengeId",
        "totalScore",
        RANK() OVER (PARTITION BY "challengeId" ORDER BY "totalScore" DESC) AS rank,
        COUNT(*) OVER (PARTITION BY "challengeId") AS "totalPlayers"
      FROM "DailyChallengeSession"
      WHERE "completedAt" IS NOT NULL
        AND "challengeId" IN (
          SELECT id FROM "DailyChallenge"
          WHERE date >= ${start} AND date < ${end}
        )
    )
    SELECT
      dc.id            AS "challengeId",
      dc.date,
      ps."totalScore",
      ps."completedAt",
      c.rank,
      c."totalPlayers"
    FROM "DailyChallenge" dc
    LEFT JOIN "DailyChallengeSession" ps
           ON ps."challengeId" = dc.id AND ps."playerId" = ${playerId}
    LEFT JOIN completions c
           ON c."challengeId" = dc.id AND c."playerId" = ${playerId}
    WHERE dc.date >= ${start} AND dc.date < ${end}
      AND dc."isPublished" = true
    ORDER BY dc.date
  `;

  const days = rows.map((row) => ({
    date: row.date.toISOString().slice(0, 10),
    challengeId: row.challengeId,
    played: row.completedAt !== null,
    totalScore: row.totalScore,
    rank: row.rank !== null ? Number(row.rank) : null,
    totalPlayers: row.totalPlayers !== null ? Number(row.totalPlayers) : null,
  }));

  return Response.json({ days });
}
