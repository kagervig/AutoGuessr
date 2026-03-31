import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: NextRequest) {
  const make = request.nextUrl.searchParams.get("make");
  if (!make) {
    return Response.json({ error: "make is required" }, { status: 400 });
  }

  const rows = await prisma.vehicle.findMany({
    where: { make: { equals: make, mode: "insensitive" } },
    select: { model: true },
    distinct: ["model"],
    orderBy: { model: "asc" },
  });

  return Response.json({ models: rows.map((r) => r.model) });
}
