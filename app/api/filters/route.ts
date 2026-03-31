import { prisma } from "@/app/lib/prisma";
import { FALLBACK_CATEGORIES, FALLBACK_REGIONS } from "@/app/lib/constants";

export async function GET() {
  const [categories, regions] = await Promise.all([
    prisma.category.findMany({ orderBy: { label: "asc" } }),
    prisma.region.findMany({ orderBy: { label: "asc" } }),
  ]);

  return Response.json({
    categories: categories.length > 0 ? categories : FALLBACK_CATEGORIES,
    regions: regions.length > 0 ? regions : FALLBACK_REGIONS,
  });
}
