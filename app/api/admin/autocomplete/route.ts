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

    case "copyright_holder": {
      const [published, staging] = await Promise.all([
        prisma.image.findMany({
          where: { copyrightHolder: { not: null } },
          select: { copyrightHolder: true },
          distinct: ["copyrightHolder"],
        }),
        prisma.stagingImage.findMany({
          where: { adminCopyrightHolder: { not: null } },
          select: { adminCopyrightHolder: true },
          distinct: ["adminCopyrightHolder"],
        }),
      ]);
      const values = [
        ...published.flatMap((r) => (r.copyrightHolder ? [r.copyrightHolder] : [])),
        ...staging.flatMap((r) => (r.adminCopyrightHolder ? [r.adminCopyrightHolder] : [])),
      ];
      const unique = [...new Set(values)].sort();
      return Response.json(unique);
    }

    case "make_defaults": {
      const rows = await prisma.vehicle.findMany({
        select: { make: true, countryOfOrigin: true, region: { select: { slug: true } } },
        distinct: ["make"],
        orderBy: { make: "asc" },
      });
      const defaults: Record<string, { country: string; regionSlug: string }> = {};
      for (const row of rows) {
        defaults[row.make] = { country: row.countryOfOrigin, regionSlug: row.region.slug };
      }
      return Response.json(defaults);
    }

    default:
      return Response.json({ error: "field must be one of: make, model, trim, country, make_defaults, copyright_holder" }, { status: 400 });
  }
}
