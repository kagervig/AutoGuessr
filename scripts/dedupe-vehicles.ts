/**
 * Find and merge duplicate Vehicle records that share the same make+model.
 *
 * Since vehicleLabel() shows only make+model (no year), multiple vehicles with
 * the same make+model appear as identical answer choices in the game.
 *
 * For each duplicate group, the vehicle with the most images is kept as the
 * primary. All images, categories, aliases, and guesses from the duplicates are
 * reassigned to the primary, then the duplicates are deleted.
 *
 * Usage:
 *   npx tsx scripts/dedupe-vehicles.ts           # dry run — shows what would change
 *   npx tsx scripts/dedupe-vehicles.ts --apply   # apply the merges
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const DRY_RUN = !process.argv.includes("--apply");

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

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

  // Group by make+model
  const groups = new Map<string, typeof vehicles>();
  for (const v of vehicles) {
    const key = `${v.make}|${v.model}`;
    const group = groups.get(key) ?? [];
    group.push(v);
    groups.set(key, group);
  }

  const duplicateGroups = [...groups.values()].filter((g) => g.length > 1);

  if (duplicateGroups.length === 0) {
    console.log("No duplicate make+model combinations found.");
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  console.log(`Found ${duplicateGroups.length} duplicate group(s):\n`);

  let mergedCount = 0;
  let deletedCount = 0;

  for (const group of duplicateGroups) {
    const label = `${group[0].make} ${group[0].model}`;
    console.log(`  ${label} (${group.length} records)`);
    for (const v of group) {
      console.log(`    id=${v.id}  year=${v.year ?? "?"}  trim=${v.trim ?? "—"}  images=${v._count.images}`);
    }

    // Primary = most images; tie-break by most recent id (cuid is time-ordered)
    const sorted = [...group].sort((a, b) => {
      if (b._count.images !== a._count.images) return b._count.images - a._count.images;
      return b.id > a.id ? 1 : -1;
    });
    const primary = sorted[0];
    const duplicates = sorted.slice(1);

    console.log(`    → keeping ${primary.id} (${primary._count.images} images)`);

    if (DRY_RUN) {
      console.log(`    → would merge ${duplicates.length} record(s) into primary\n`);
      continue;
    }

    for (const dup of duplicates) {
      // Reassign images
      await prisma.image.updateMany({
        where: { vehicleId: dup.id },
        data: { vehicleId: primary.id },
      });

      // Reassign VehicleCategory — skip any that would violate the composite PK
      const dupCategories = await prisma.vehicleCategory.findMany({
        where: { vehicleId: dup.id },
        select: { categoryId: true },
      });
      for (const { categoryId } of dupCategories) {
        const existing = await prisma.vehicleCategory.findUnique({
          where: { vehicleId_categoryId: { vehicleId: primary.id, categoryId } },
        });
        if (!existing) {
          await prisma.vehicleCategory.create({ data: { vehicleId: primary.id, categoryId } });
        }
        await prisma.vehicleCategory.delete({
          where: { vehicleId_categoryId: { vehicleId: dup.id, categoryId } },
        });
      }

      // Reassign VehicleAlias
      await prisma.vehicleAlias.updateMany({
        where: { vehicleId: dup.id },
        data: { vehicleId: primary.id },
      });

      // Reassign Guess.guessedVehicleId
      await prisma.guess.updateMany({
        where: { guessedVehicleId: dup.id },
        data: { guessedVehicleId: primary.id },
      });

      await prisma.vehicle.delete({ where: { id: dup.id } });

      console.log(`    ✓ merged ${dup.id} into ${primary.id}`);
      deletedCount++;
    }

    mergedCount++;
    console.log();
  }

  await prisma.$disconnect();
  await pool.end();

  if (DRY_RUN) {
    console.log(`\nDry run — no changes made. Re-run with --apply to merge.`);
  } else {
    console.log(`\nDone. Merged ${mergedCount} group(s), deleted ${deletedCount} duplicate(s).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
