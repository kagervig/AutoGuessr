import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { isActive } = await request.json();

  if (typeof isActive !== "boolean") {
    return Response.json({ error: "isActive must be a boolean" }, { status: 400 });
  }

  const image = await prisma.image.update({
    where: { id },
    data: { isActive },
    select: { id: true, isActive: true },
  });

  return Response.json(image);
}
