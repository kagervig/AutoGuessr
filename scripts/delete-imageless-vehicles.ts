/**
 * Identifies and deletes Vehicle records that have no associated images.
 *
 * Usage:
 *   npx tsx scripts/delete-imageless-vehicles.ts           # dry run
 *   npx tsx scripts/delete-imageless-vehicles.ts --apply   # apply deletion
 */

import "dotenv/config";
import { prisma } from "../app/lib/prisma";

const APPLY = process.argv.includes("--apply");
const LIMIT_ARG = process.argv.find(arg => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1]) : null;
const BATCH_SIZE = 100;

async function main(): Promise<void> {
  console.log("Counting vehicles with no images...");
  const totalImageless = await prisma.vehicle.count({
    where: {
      images: { none: {} }
    }
  });

  if (totalImageless === 0) {
    console.log("No imageless vehicles found.");
    await prisma.$disconnect();
    return;
  }

  console.log("Fetching all vehicle and image associations...");
  const [allVehicles, vehiclesWithImages] = await Promise.all([
    prisma.vehicle.findMany({
      select: { id: true, year: true, make: true, model: true }
    }),
    prisma.image.findMany({
      select: { vehicleId: true },
      distinct: ['vehicleId']
    })
  ]);

  const withImageSet = new Set(vehiclesWithImages.map(i => i.vehicleId));
  const imagelessVehicles = allVehicles.filter(v => !withImageSet.has(v.id));
  
  console.log(`Found ${imagelessVehicles.length} vehicles with no images.`);
  
  const vehicles = LIMIT ? imagelessVehicles.slice(0, LIMIT) : imagelessVehicles;

  if (!APPLY) {
    console.log("Sample of vehicles to be deleted:");
    vehicles.slice(0, 20).forEach(v => {
      console.log(`- ${v.year} ${v.make} ${v.model} (${v.id})`);
    });
    if (vehicles.length > 20) console.log(`... and ${vehicles.length - 20} more.`);
    console.log(`\nDry run: No vehicles were deleted. Run with --apply to delete all ${vehicles.length} vehicles.`);
    await prisma.$disconnect();
    return;
  }

  console.log(`Deleting ${vehicles.length} vehicles in batches of ${BATCH_SIZE}...`);
  
  let deletedCount = 0;
  for (let i = 0; i < vehicles.length; i += BATCH_SIZE) {
    const batch = vehicles.slice(i, i + BATCH_SIZE);
    const ids = batch.map(v => v.id);

    try {
      await prisma.$transaction([
        // Handle dependent records
        prisma.vehicleTrivia.deleteMany({ where: { vehicleId: { in: ids } } }),
        prisma.vehicleCategory.deleteMany({ where: { vehicleId: { in: ids } } }),
        prisma.vehicleAlias.deleteMany({ where: { vehicleId: { in: ids } } }),
        prisma.guess.deleteMany({ where: { guessedVehicleId: { in: ids } } }),
        prisma.featuredVehicleOfDay.deleteMany({ where: { vehicleId: { in: ids } } }),
        // Delete the vehicles
        prisma.vehicle.deleteMany({ where: { id: { in: ids } } })
      ]);
      
      deletedCount += batch.length;
      console.log(`Progress: ${deletedCount}/${vehicles.length} deleted...`);
    } catch (err) {
      console.error(`Failed to delete batch starting at index ${i}:`, err);
    }
  }

  console.log(`\nDone. Deleted ${deletedCount} vehicles.`);
  
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
