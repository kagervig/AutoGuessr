// GET /api/daily — today's published challenge status (no spoilers).
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getDailyChallenge } from "@/app/lib/daily-challenge";

export async function GET(request: NextRequest) {
  const challenge = await getDailyChallenge();

  if (!challenge || !challenge.isPublished) {
    return Response.json({ available: false }, { status: 404 });
  }

  const cookieSessionId = request.cookies.get(`dc_${challenge.challengeNumber}`)?.value;
  let alreadyPlayed = false;
  let existingSessionId: string | null = null;

  if (cookieSessionId) {
    const session = await prisma.gameSession.findUnique({
      where: { id: cookieSessionId },
      select: { id: true, endedAt: true },
    });
    if (session?.endedAt) {
      alreadyPlayed = true;
      existingSessionId = session.id;
    }
  }

  return Response.json({
    challengeNumber: challenge.challengeNumber,
    date: challenge.date.toISOString().slice(0, 10),
    imageCount: challenge.imageIds.length,
    alreadyPlayed,
    existingSessionId,
  });
}
