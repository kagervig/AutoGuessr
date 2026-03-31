import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

const VALID_MODES = ["easy", "medium", "hard", "hardcore", "competitive"] as const;
const VALID_PERIODS = ["day", "week", "alltime"] as const;
type Period = (typeof VALID_PERIODS)[number];

function periodStart(period: Period): Date | null {
  const now = new Date();
  if (period === "day") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === "week") {
    const day = now.getDay(); // 0=Sun
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // ISO week starts Mon
    return new Date(now.getFullYear(), now.getMonth(), diff);
  }
  return null; // alltime
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const modeParam = searchParams.get("mode");
  const periodParam = (searchParams.get("period") ?? "alltime") as Period;

  const mode =
    modeParam && VALID_MODES.includes(modeParam as (typeof VALID_MODES)[number])
      ? (modeParam as (typeof VALID_MODES)[number])
      : null;

  const period = VALID_PERIODS.includes(periodParam) ? periodParam : "alltime";
  const startDate = periodStart(period);

  // Aggregate total points per player for the given mode and period
  const sessions = await prisma.gameSession.groupBy({
    by: ["playerId"],
    where: {
      endedAt: { not: null },
      finalScore: { not: null, gt: 0 },
      ...(mode ? { mode } : { mode: { in: [...VALID_MODES] } }),
      ...(startDate ? { startedAt: { gte: startDate } } : {}),
    },
    _sum: { finalScore: true },
    _count: { id: true },
    orderBy: { _sum: { finalScore: "desc" } },
    take: 20,
  });

  // Remove sessions without a playerId
  const withPlayer = sessions.filter((s) => s.playerId !== null);

  const playerIds = withPlayer.map((s) => s.playerId as string);
  const players = await prisma.player.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, username: true },
  });
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p.username]));

  const entries = withPlayer.map((s, i) => ({
    rank: i + 1,
    username: playerMap[s.playerId as string] ?? "Unknown",
    totalScore: s._sum.finalScore ?? 0,
    gamesPlayed: s._count.id,
  }));

  return Response.json(entries);
}
