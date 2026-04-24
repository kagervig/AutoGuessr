// Admin: update a daily challenge (imageIds, isPublished, curatedBy).
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as {
    imageIds?: string[];
    isPublished?: boolean;
    curatedBy?: string | null;
  };

  const challenge = await prisma.dailyChallenge.findUnique({ where: { id } });
  if (!challenge) {
    return Response.json({ error: "Challenge not found" }, { status: 404 });
  }

  const updated = await prisma.dailyChallenge.update({
    where: { id },
    data: {
      ...(body.imageIds !== undefined && { imageIds: body.imageIds }),
      ...(body.isPublished !== undefined && { isPublished: body.isPublished }),
      ...(body.curatedBy !== undefined && { curatedBy: body.curatedBy }),
    },
  });

  return Response.json({
    id: updated.id,
    challengeNumber: updated.challengeNumber,
    date: updated.date.toISOString().slice(0, 10),
    isPublished: updated.isPublished,
    curatedBy: updated.curatedBy,
    imageIds: updated.imageIds,
  });
}
