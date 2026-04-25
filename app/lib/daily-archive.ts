// Daily archive helpers: month overview data, ranking, and leaderboard queries.

import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { MAX_DAILY_ROUND_SCORE } from "./constants";
import { dailyPercent } from "./daily-display";

export type PlayedSummary = {
  finalScore: number;
  percent: number; // 0..1
  rank: number; // 1-indexed
  medal: "gold" | "silver" | "bronze" | null; // rank 1/2/3 only
  roundEmojis: string; // "🟢🟡🔴..."
};

export type DayOverview = {
  date: Date;
  challengeNumber: number | null;
  isPublished: boolean;
  played: PlayedSummary | null;
};

type CookieStore = Awaited<ReturnType<typeof cookies>>;

export function readDailyCookies(
  cookieStore: CookieStore
): Map<number, string> {
  const map = new Map<number, string>();

  // cookieStore.getAll() returns an array of RequestCookie objects
  const allCookies = cookieStore.getAll();

  for (const cookie of allCookies) {
    const match = cookie.name.match(/^dc_(\d+)$/);
    if (match && cookie.value) {
      const challengeNumber = parseInt(match[1], 10);
      map.set(challengeNumber, String(cookie.value));
    }
  }

  return map;
}

export async function getMonthOverview(args: {
  days: Date[];
  cookieSessionsByChallengeNumber: Map<number, string>;
}): Promise<DayOverview[]> {
  const { days, cookieSessionsByChallengeNumber } = args;

  if (days.length === 0) return [];

  // Fetch all challenges for these dates
  const challenges = await prisma.dailyChallenge.findMany({
    where: {
      date: {
        gte: days[0],
        lte: days[days.length - 1],
      },
    },
    select: {
      id: true,
      date: true,
      challengeNumber: true,
      isPublished: true,
    },
  });

  // Build a map: date ISO string → challenge
  const challengeByDateIso = new Map<string, (typeof challenges)[0]>();
  for (const challenge of challenges) {
    const iso = challenge.date.toISOString().slice(0, 10);
    challengeByDateIso.set(iso, challenge);
  }

  // Fetch all user sessions for the challenge IDs we have cookies for
  const sessionIds = Array.from(cookieSessionsByChallengeNumber.values());
  const userSessions = await prisma.gameSession.findMany({
    where: {
      id: { in: sessionIds },
    },
    select: {
      id: true,
      dailyChallengeId: true,
      finalScore: true,
      endedAt: true,
      rounds: {
        select: {
          guess: {
            select: {
              pointsEarned: true,
            },
          },
        },
        orderBy: { sequenceNumber: "asc" },
      },
    },
  });

  // Build a map: challengeId → user session
  const userSessionByChallengeId = new Map<
    string,
    (typeof userSessions)[0]
  >();
  for (const session of userSessions) {
    if (session.dailyChallengeId) {
      userSessionByChallengeId.set(session.dailyChallengeId, session);
    }
  }

  // Build overviews
  const overviews: DayOverview[] = [];

  for (const day of days) {
    const dateIso = day.toISOString().slice(0, 10);
    const challenge = challengeByDateIso.get(dateIso);

    const overview: DayOverview = {
      date: day,
      challengeNumber: challenge?.challengeNumber ?? null,
      isPublished: challenge?.isPublished ?? false,
      played: null,
    };

    if (challenge) {
      const userSession = userSessionByChallengeId.get(challenge.id);

      if (userSession && userSession.endedAt && userSession.finalScore !== null) {
        // Count how many sessions on this challenge scored higher
        const betterCount = await prisma.gameSession.count({
          where: {
            dailyChallengeId: challenge.id,
            endedAt: { not: null },
            finalScore: { gt: userSession.finalScore },
          },
        });

        const rank = betterCount + 1;
        const percent = dailyPercent(userSession.finalScore);

        // Determine medal
        let medal: "gold" | "silver" | "bronze" | null = null;
        if (rank === 1) medal = "gold";
        else if (rank === 2) medal = "silver";
        else if (rank === 3) medal = "bronze";

        // Build round emoji grid
        const roundEmojis = userSession.rounds
          .map((r) => {
            const score = r.guess?.pointsEarned ?? 0;
            if (score >= MAX_DAILY_ROUND_SCORE * 0.8) return "🟢";
            if (score >= MAX_DAILY_ROUND_SCORE * 0.4) return "🟡";
            return "🔴";
          })
          .join("");

        overview.played = {
          finalScore: userSession.finalScore,
          percent,
          rank,
          medal,
          roundEmojis,
        };
      }
    }

    overviews.push(overview);
  }

  return overviews;
}
