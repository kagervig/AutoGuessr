import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import type { DimensionType } from "@/app/generated/prisma/client";

const VALID_DIMENSION_TYPES: DimensionType[] = ["category", "region", "country"];

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, dimensionType, dimensionKey, correct, incorrect } = body as {
    username: string;
    dimensionType: string;
    dimensionKey: string;
    correct: number;
    incorrect: number;
  };

  if (!username || !dimensionType || !dimensionKey) {
    return Response.json({ error: "username, dimensionType, and dimensionKey are required" }, { status: 400 });
  }

  if (!VALID_DIMENSION_TYPES.includes(dimensionType as DimensionType)) {
    return Response.json({ error: "Invalid dimensionType" }, { status: 400 });
  }

  const player = await prisma.player.findUnique({ where: { username } });
  if (!player) {
    return Response.json({ error: "Player not found" }, { status: 404 });
  }

  const existing = await prisma.playerDimensionStats.findUnique({
    where: {
      playerId_dimensionType_dimensionKey: {
        playerId: player.id,
        dimensionType: dimensionType as DimensionType,
        dimensionKey,
      },
    },
  });

  const newCorrect = (existing?.correct ?? 0) + correct;
  const newIncorrect = (existing?.incorrect ?? 0) + incorrect;
  const newStreak =
    incorrect === 0 ? (existing?.streak ?? 0) + correct : 0;

  const stats = await prisma.playerDimensionStats.upsert({
    where: {
      playerId_dimensionType_dimensionKey: {
        playerId: player.id,
        dimensionType: dimensionType as DimensionType,
        dimensionKey,
      },
    },
    update: {
      correct: newCorrect,
      incorrect: newIncorrect,
      streak: newStreak,
      lastPlayedAt: new Date(),
    },
    create: {
      playerId: player.id,
      dimensionType: dimensionType as DimensionType,
      dimensionKey,
      correct: newCorrect,
      incorrect: newIncorrect,
      streak: newStreak,
      lastPlayedAt: new Date(),
    },
  });

  return Response.json(stats);
}

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  if (!username) {
    return Response.json({ error: "username is required" }, { status: 400 });
  }

  const player = await prisma.player.findUnique({ where: { username } });
  if (!player) {
    return Response.json([]);
  }

  const stats = await prisma.playerDimensionStats.findMany({
    where: { playerId: player.id },
    orderBy: { lastPlayedAt: "desc" },
  });

  return Response.json(stats);
}
