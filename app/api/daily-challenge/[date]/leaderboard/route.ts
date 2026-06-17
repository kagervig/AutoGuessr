// GET /api/daily-challenge/[date]/leaderboard — ranked scores for all players who completed a challenge.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getChallengeByDate } from "@/app/lib/daily-challenge";

const MAX_ENTRIES = 50;

type LeaderboardRow = {
  rank: bigint;
  username: string | null;
  totalScore: number;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date: dateParam } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return Response.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
  }

  const challenge = await getChallengeByDate(dateParam);
  if (!challenge || !challenge.isPublished) {
    return Response.json({ error: "Challenge not found." }, { status: 404 });
  }

  const rows = await prisma.$queryRaw<LeaderboardRow[]>`
    SELECT
      RANK() OVER (ORDER BY dcs."totalScore" DESC) AS rank,
      p.username,
      dcs."totalScore"
    FROM "DailyChallengeSession" dcs
    LEFT JOIN "Player" p ON p.id = dcs."playerId"
    WHERE dcs."challengeId" = ${challenge.id}
      AND dcs."completedAt" IS NOT NULL
    ORDER BY dcs."totalScore" DESC
    LIMIT ${MAX_ENTRIES}
  `;

  const entries = rows.map((row) => ({
    rank: Number(row.rank),
    username: row.username,
    totalScore: row.totalScore,
  }));

  return Response.json({ entries });
}
