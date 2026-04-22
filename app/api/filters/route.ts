import { prisma } from "@/app/lib/prisma";
import { COUNTRIES, FALLBACK_CATEGORIES, FALLBACK_REGIONS } from "@/app/lib/constants";

const MIN_VEHICLES = 20;
const MIN_ACTIVE_VEHICLES_FOR_MAKE = 6;

export async function GET() {
  const [allCategories, allRegions, vehicleCountsByCountry, vehicleCountsByMake] = await Promise.all([
    prisma.category.findMany({
      orderBy: { label: "asc" },
      include: {
        _count: {
          select: {
            vehicles: {
              where: { vehicle: { images: { some: { isActive: true } } } },
            },
          },
        },
      },
    }),
    prisma.region.findMany({
      orderBy: { label: "asc" },
      include: {
        _count: {
          select: {
            vehicles: { where: { images: { some: { isActive: true } } } },
          },
        },
      },
    }),
    prisma.vehicle.groupBy({
      by: ["countryOfOrigin"],
      where: { images: { some: { isActive: true } } },
      _count: { id: true },
    }),
    prisma.vehicle.groupBy({
      by: ["make"],
      where: { images: { some: { isActive: true } } },
      _count: { id: true },
    }),
  ]);

  const categories =
    allCategories.length > 0
      ? allCategories
          .filter((c) => c._count.vehicles >= MIN_VEHICLES)
          .map(({ id, slug, label }) => ({ id, slug, label }))
      : FALLBACK_CATEGORIES;

  const regions =
    allRegions.length > 0
      ? allRegions
          .filter((r) => r._count.vehicles >= MIN_VEHICLES)
          .map(({ id, slug, label }) => ({ id, slug, label }))
      : FALLBACK_REGIONS;

  const qualifiedCountryCodes = new Set(
    vehicleCountsByCountry
      .filter((row) => row._count.id >= MIN_VEHICLES)
      .map((row) => row.countryOfOrigin)
  );
  const countries = COUNTRIES.filter((c) => qualifiedCountryCodes.has(c.code));

  const makes = vehicleCountsByMake
    .filter((row) => row._count.id >= MIN_ACTIVE_VEHICLES_FOR_MAKE)
    .map((row) => row.make)
    .sort();

  return Response.json({ categories, regions, countries, makes });
}
