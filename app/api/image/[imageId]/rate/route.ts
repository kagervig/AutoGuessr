import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

interface Params {
  params: Promise<{ imageId: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const { imageId } = await params;
  const body = await request.json();
  const { value } = body;

  if (value !== 1 && value !== -1) {
    return Response.json({ error: "value must be 1 or -1" }, { status: 400 });
  }

  const image = await prisma.image.findUnique({ where: { id: imageId } });
  if (!image) {
    return Response.json({ error: "Image not found" }, { status: 404 });
  }

  await prisma.imageStats.upsert({
    where: { imageId },
    update: value === 1 ? { thumbsUp: { increment: 1 } } : { thumbsDown: { increment: 1 } },
    create: { imageId, thumbsUp: value === 1 ? 1 : 0, thumbsDown: value === -1 ? 1 : 0 },
  });

  return Response.json({ ok: true });
}
