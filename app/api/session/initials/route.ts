import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

const INITIALS_RE = /^[A-Z]{1,3}$/;

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { gameId, initials } = body as { gameId?: string; initials?: string };

  if (!gameId) {
    return Response.json({ error: "gameId is required" }, { status: 400 });
  }

  const normalised = typeof initials === "string" ? initials.toUpperCase().trim() : "";
  if (!INITIALS_RE.test(normalised)) {
    return Response.json({ error: "Initials must be 1–3 letters A–Z" }, { status: 400 });
  }

  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    select: { id: true, endedAt: true, initials: true, mode: true, sessionToken: true },
  });

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  if (!session.endedAt) {
    return Response.json({ error: "Session has not ended yet" }, { status: 409 });
  }

  if (session.initials) {
    return Response.json({ error: "Initials already set" }, { status: 409 });
  }

  if (session.mode === "practice") {
    return Response.json({ error: "Practice sessions are not on the leaderboard" }, { status: 400 });
  }

  const cookie = request.cookies.get(`st_${gameId}`)?.value;
  if (!cookie || cookie !== session.sessionToken) {
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }

  await prisma.gameSession.update({
    where: { id: gameId },
    data: { initials: normalised },
  });

  return Response.json({ ok: true });
}
