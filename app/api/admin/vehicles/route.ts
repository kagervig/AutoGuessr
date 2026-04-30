// Admin: look up vehicles by make and model for the challenge car selector.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const make = searchParams.get("make");
  const model = searchParams.get("model");

  if (!make || !model) {
    return Response.json({ error: "make and model are required" }, { status: 400 });
  }

  const vehicles = await prisma.vehicle.findMany({
    where: {
      make: { equals: make, mode: "insensitive" },
      model: { equals: model, mode: "insensitive" },
    },
    select: { id: true, make: true, model: true, year: true, trim: true },
    orderBy: { year: "asc" },
    take: 20,
  });

  return Response.json({ vehicles });
}
