// Admin: delete or edit a single daily challenge.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";
import { pickImageIdsForChallenge } from "@/app/lib/daily-challenge";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const challenge = await prisma.dailyChallenge.findUnique({ where: { id } });
  if (!challenge) return Response.json({ error: "Not found" }, { status: 404 });

  try {
    await prisma.dailyChallenge.delete({ where: { id } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json() as { replaceImageId?: string; withImageId?: string };
  const { replaceImageId, withImageId } = body;

  if (!replaceImageId || typeof replaceImageId !== "string") {
    return Response.json({ error: "replaceImageId is required" }, { status: 400 });
  }

  const challenge = await prisma.dailyChallenge.findUnique({ where: { id } });
  if (!challenge) return Response.json({ error: "Not found" }, { status: 404 });

  const todayUTC = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  if (challenge.date <= todayUTC) {
    return Response.json({ error: "Cannot edit a challenge from the past or present" }, { status: 403 });
  }

  if (!challenge.imageIds.includes(replaceImageId)) {
    return Response.json({ error: "replaceImageId not in challenge" }, { status: 400 });
  }

  let newImageId: string;

  if (withImageId) {
    const image = await prisma.image.findUnique({ where: { id: withImageId } });
    if (!image || !image.isActive) {
      return Response.json({ error: "Image not found or inactive" }, { status: 400 });
    }
    if (challenge.imageIds.includes(withImageId)) {
      return Response.json({ error: "Image already in challenge" }, { status: 400 });
    }
    newImageId = withImageId;
  } else {
    const ids = await pickImageIdsForChallenge(1, challenge.imageIds);
    newImageId = ids[0];
  }

  const newImageIds = challenge.imageIds.map((imgId) => (imgId === replaceImageId ? newImageId : imgId));

  await prisma.dailyChallenge.update({ where: { id }, data: { imageIds: newImageIds } });

  const images = await prisma.image.findMany({
    where: { id: { in: newImageIds } },
    select: {
      id: true,
      filename: true,
      vehicle: { select: { id: true, make: true, model: true } },
    },
  });

  const imageMap = new Map(
    images.map((img) => [
      img.id,
      {
        id: img.id,
        url: imageUrl(img.filename, img.vehicle.id),
        make: img.vehicle.make,
        model: img.vehicle.model,
      },
    ])
  );

  return Response.json({
    id: challenge.id,
    date: challenge.date.toISOString().slice(0, 10),
    imageIds: newImageIds,
    isPublished: challenge.isPublished,
    curatedBy: challenge.curatedBy,
    generatedAt: challenge.generatedAt.toISOString(),
    images: newImageIds.map((imgId) => imageMap.get(imgId) ?? { id: imgId, url: null, make: null, model: null }),
  });
}
