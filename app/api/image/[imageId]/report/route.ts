import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

interface Params {
  params: Promise<{ imageId: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const { imageId } = await params;

  const image = await prisma.image.findUnique({ where: { id: imageId } });
  if (!image) {
    return Response.json({ error: "Image not found" }, { status: 404 });
  }

  await prisma.imageStats.upsert({
    where: { imageId },
    update: { reportCount: { increment: 1 } },
    create: { imageId, reportCount: 1 },
  });

  return Response.json({ ok: true });
}
