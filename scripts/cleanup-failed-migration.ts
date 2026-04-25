// Cleans up partial state from failed 20260423130957_add_car_of_the_day migration.
// Safe to run multiple times — all statements use IF EXISTS.
import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('DROP TABLE IF EXISTS "FeaturedVehicleOfDay" CASCADE');
    console.log("✓ dropped FeaturedVehicleOfDay (if existed)");

    await client.query('DROP TABLE IF EXISTS "VehicleTrivia" CASCADE');
    console.log("✓ dropped VehicleTrivia (if existed)");

    await client.query('ALTER TABLE "GameSession" DROP COLUMN IF EXISTS "featuredVehicleIdAtStart"');
    console.log("✓ dropped GameSession.featuredVehicleIdAtStart (if existed)");

    await client.query('ALTER TABLE "Guess" DROP COLUMN IF EXISTS "dailyDiscoveryBonus"');
    console.log("✓ dropped Guess.dailyDiscoveryBonus (if existed)");

    console.log("\nDone. Now run: prisma migrate resolve --rolled-back 20260423130957_add_car_of_the_day");
    console.log("Then: prisma migrate deploy");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
