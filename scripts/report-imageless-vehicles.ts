// Reports all vehicles that have no active images.
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const vehicles = await prisma.vehicle.findMany({
    where: { images: { none: { isActive: true } } },
    select: { make: true, model: true, year: true },
    orderBy: [{ make: "asc" }, { model: "asc" }, { year: "asc" }],
  });

  if (vehicles.length === 0) {
    console.log("No vehicles found with 0 active images.");
  } else {
    console.log(`Found ${vehicles.length} vehicles with 0 active images:\n`);
    for (const v of vehicles) {
      console.log(`  ${v.year} ${v.make} ${v.model}`);
    }
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
