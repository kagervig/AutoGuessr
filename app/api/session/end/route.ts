import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { gameId, finalScore } = body as { gameId: string; finalScore: number };

  if (!gameId) {
    return Response.json({ error: "gameId is required" }, { status: 400 });
  }

  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    select: {
      id: true,
      endedAt: true,
      sessionToken: true,
    },
  });

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const cookie = request.cookies.get(`st_${gameId}`)?.value;
  if (!cookie || cookie !== session.sessionToken) {
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }

  if (session.endedAt) {
    return Response.json({ error: "Session already ended" }, { status: 409 });
  }

  const endedSession = await prisma.gameSession.update({
    where: { id: gameId },
    data: { endedAt: new Date(), finalScore: finalScore ?? 0 },
  });

  return Response.json({ gameId, finalScore: finalScore ?? 0, endedAt: endedSession.endedAt });
}
