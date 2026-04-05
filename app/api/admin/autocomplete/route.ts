import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const field = searchParams.get("field");
  const make = searchParams.get("make") ?? undefined;
  const model = searchParams.get("model") ?? undefined;

  switch (field) {
    case "make": {
      const rows = await prisma.vehicle.findMany({
        select: { make: true },
        distinct: ["make"],
        orderBy: { make: "asc" },
      });
      return Response.json(rows.map((r) => r.make));
    }

    case "model": {
      const rows = await prisma.vehicle.findMany({
        where: make ? { make: { equals: make, mode: "insensitive" } } : undefined,
        select: { model: true },
        distinct: ["model"],
        orderBy: { model: "asc" },
      });
      return Response.json(rows.map((r) => r.model));
    }

    case "trim": {
      const rows = await prisma.vehicle.findMany({
        where: {
          ...(make ? { make: { equals: make, mode: "insensitive" } } : {}),
          ...(model ? { model: { equals: model, mode: "insensitive" } } : {}),
          trim: { not: null },
        },
        select: { trim: true },
        distinct: ["trim"],
        orderBy: { trim: "asc" },
      });
      return Response.json(rows.flatMap((r) => (r.trim ? [r.trim] : [])));
    }

    case "country": {
      const rows = await prisma.vehicle.findMany({
        select: { countryOfOrigin: true },
        distinct: ["countryOfOrigin"],
        orderBy: { countryOfOrigin: "asc" },
      });
      return Response.json(rows.map((r) => r.countryOfOrigin));
    }

    default:
      return Response.json({ error: "field must be one of: make, model, trim, country" }, { status: 400 });
  }
}
