import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";

// Session end is handled by /api/session/end

export async function GET(request: NextRequest) {
  const gameId = request.nextUrl.searchParams.get("gameId");
  if (!gameId) {
    return Response.json({ error: "gameId is required" }, { status: 400 });
  }

  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    include: {
      rounds: {
        orderBy: { sequenceNumber: "asc" },
        include: {
          image: {
            select: {
              id: true,
              filename: true,
              vehicleId: true,
              vehicle: {
                select: { make: true, model: true, year: true, countryOfOrigin: true },
              },
            },
          },
          guess: {
            include: {
              guessedVehicle: {
                select: { make: true, model: true, year: true },
              },
            },
          },
        },
      },
    },
  });

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  // Personal best for this mode and player
  let personalBest: number | null = null;
  if (session.playerId) {
    const best = await prisma.gameSession.findFirst({
      where: { playerId: session.playerId, mode: session.mode, finalScore: { not: null } },
      orderBy: { finalScore: "desc" },
      select: { finalScore: true },
    });
    personalBest = best?.finalScore ?? null;
  }

  // Enrich rounds with imageUrl
  const rounds = session.rounds.map((r) => ({
    ...r,
    imageUrl: imageUrl(r.image.filename, r.image.vehicleId),
  }));

  return Response.json({ ...session, rounds, personalBest });
}

