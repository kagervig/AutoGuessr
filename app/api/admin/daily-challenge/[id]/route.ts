// Admin: delete a future daily challenge.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { isChallengeAccessible } from "@/app/lib/daily-challenge";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const challenge = await prisma.dailyChallenge.findUnique({ where: { id } });
  if (!challenge) return Response.json({ error: "Not found" }, { status: 404 });

  if (isChallengeAccessible(challenge)) {
    return Response.json({ error: "Cannot delete a past or live challenge" }, { status: 409 });
  }

  await prisma.dailyChallenge.delete({ where: { id } });

  return new Response(null, { status: 204 });
}
