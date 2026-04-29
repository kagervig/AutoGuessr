// Admin: update image IDs or delete a future daily challenge.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { isChallengeAccessible } from "@/app/lib/daily-challenge";

type Params = { params: Promise<{ id: string }> };

async function resolveChallenge(idParam: string) {
  const id = parseInt(idParam, 10);
  if (isNaN(id)) return { error: "Invalid id", status: 400 as const, challenge: null };

  const challenge = await prisma.dailyChallenge.findUnique({ where: { id } });
  if (!challenge) return { error: "Not found", status: 404 as const, challenge: null };

  if (isChallengeAccessible(challenge)) {
    return { error: "Cannot modify a past or live challenge", status: 409 as const, challenge: null };
  }

  return { error: null, status: null, challenge };
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error, status, challenge } = await resolveChallenge(id);
  if (error) return Response.json({ error }, { status: status! });

  const body = await request.json() as { imageIds?: string[] };

  if (!Array.isArray(body.imageIds) || body.imageIds.length === 0) {
    return Response.json({ error: "imageIds must be a non-empty array" }, { status: 400 });
  }

  const updated = await prisma.dailyChallenge.update({
    where: { id: challenge!.id },
    data: { imageIds: body.imageIds },
  });

  return Response.json({ challenge: updated });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error, status, challenge } = await resolveChallenge(id);
  if (error) return Response.json({ error }, { status: status! });

  await prisma.dailyChallenge.delete({ where: { id: challenge!.id } });

  return new Response(null, { status: 204 });
}
