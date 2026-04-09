import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

const VALID_MODES = ["easy", "custom", "standard", "hardcore", "time_attack"] as const;
const VALID_PERIODS = ["day", "week", "alltime"] as const;
type Period = (typeof VALID_PERIODS)[number];

function periodStart(period: Period): Date | null {
  const now = new Date();
  if (period === "day") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === "week") {
    const day = now.getDay();
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

  const sessions = await prisma.gameSession.findMany({
    where: {
      endedAt: { not: null },
      finalScore: { not: null, gt: 0 },
      initials: { not: null },
      ...(mode ? { mode } : { mode: { in: [...VALID_MODES] } }),
      ...(startDate ? { startedAt: { gte: startDate } } : {}),
    },
    orderBy: { finalScore: "desc" },
    take: 20,
    select: {
      id: true,
      initials: true,
      finalScore: true,
      mode: true,
      startedAt: true,
    },
  });

  const entries = sessions.map((s, i) => ({
    rank: i + 1,
    initials: s.initials as string,
    score: s.finalScore as number,
    mode: s.mode,
    date: s.startedAt.toISOString(),
  }));

  return Response.json(entries);
}
