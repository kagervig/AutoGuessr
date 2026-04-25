import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const maxDuration = 300;

export async function GET() {
  const vehicles = await prisma.vehicle.findMany({
    select: {
      id: true,
      make: true,
      model: true,
      year: true,
      trim: true,
      _count: { select: { images: true } },
    },
    orderBy: [{ make: "asc" }, { model: "asc" }, { year: "asc" }],
  });

  const groups = new Map<string, typeof vehicles>();
  for (const v of vehicles) {
    const key = `${v.make}|${v.model}`;
    const group = groups.get(key) ?? [];
    group.push(v);
    groups.set(key, group);
  }

  const duplicateGroups = Array.from(groups.values())
    .filter((g) => g.length > 1)
    .map((g) => {
      // Primary = most images; tie-break by most recent id
      const sorted = [...g].sort((a, b) => {
        if (b._count.images !== a._count.images) return b._count.images - a._count.images;
        return b.id > a.id ? 1 : -1;
      });
      return {
        make: g[0].make,
        model: g[0].model,
        primary: sorted[0],
        duplicates: sorted.slice(1),
      };
    });

  return NextResponse.json({ duplicateGroups });
}

export async function POST() {
  const vehicles = await prisma.vehicle.findMany({
    select: {
      id: true,
      make: true,
      model: true,
      _count: { select: { images: true } },
    },
  });

  const groups = new Map<string, typeof vehicles>();
  for (const v of vehicles) {
    const key = `${v.make}|${v.model}`;
    const group = groups.get(key) ?? [];
    group.push(v);
    groups.set(key, group);
  }

  const duplicateGroups = Array.from(groups.values()).filter((g) => g.length > 1);

  let mergedCount = 0;
  let deletedCount = 0;

  for (const group of duplicateGroups) {
    const sorted = [...group].sort((a, b) => {
      if (b._count.images !== a._count.images) return b._count.images - a._count.images;
      return b.id > a.id ? 1 : -1;
    });
    const primary = sorted[0];
    const duplicates = sorted.slice(1);

    for (const dup of duplicates) {
      await prisma.$transaction(async (tx) => {
        // Reassign images
        await tx.image.updateMany({
          where: { vehicleId: dup.id },
          data: { vehicleId: primary.id },
        });

        // Reassign VehicleCategory
        const dupCategories = await tx.vehicleCategory.findMany({
          where: { vehicleId: dup.id },
          select: { categoryId: true },
        });

        for (const { categoryId } of dupCategories) {
          const existing = await tx.vehicleCategory.findUnique({
            where: { vehicleId_categoryId: { vehicleId: primary.id, categoryId } },
          });
          if (!existing) {
            await tx.vehicleCategory.create({ data: { vehicleId: primary.id, categoryId } });
          }
          await tx.vehicleCategory.delete({
            where: { vehicleId_categoryId: { vehicleId: dup.id, categoryId } },
          });
        }

        // Reassign VehicleAlias
        await tx.vehicleAlias.updateMany({
          where: { vehicleId: dup.id },
          data: { vehicleId: primary.id },
        });

        // Reassign Guesses
        await tx.guess.updateMany({
          where: { guessedVehicleId: dup.id },
          data: { guessedVehicleId: primary.id },
        });

        // Reassign FeaturedVehicleOfDay
        await tx.featuredVehicleOfDay.updateMany({
          where: { vehicleId: dup.id },
          data: { vehicleId: primary.id },
        });

        // Reassign VehicleTrivia
        const primaryTrivia = await tx.vehicleTrivia.findUnique({
          where: { vehicleId: primary.id },
        });
        if (!primaryTrivia) {
          const dupTrivia = await tx.vehicleTrivia.findUnique({
            where: { vehicleId: dup.id },
          });
          if (dupTrivia) {
            const { vehicleId: _, ...triviaData } = dupTrivia;
            await tx.vehicleTrivia.delete({ where: { vehicleId: dup.id } });
            await tx.vehicleTrivia.create({
              data: {
                ...triviaData,
                vehicleId: primary.id,
              },
            });
          }
        } else {
          await tx.vehicleTrivia.deleteMany({ where: { vehicleId: dup.id } });
        }

        // Delete the duplicate vehicle
        await tx.vehicle.delete({ where: { id: dup.id } });
      });
      deletedCount++;
    }
    mergedCount++;
  }

  return NextResponse.json({ mergedCount, deletedCount });
}
