// Manually applies the 20260423130957_add_car_of_the_day migration SQL directly.
// Use when prisma migrate deploy fails to detect the migration as pending.
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`ALTER TABLE "GameSession" ADD COLUMN IF NOT EXISTS "featuredVehicleIdAtStart" TEXT`);
    console.log("✓ GameSession.featuredVehicleIdAtStart");

    await client.query(`ALTER TABLE "Guess" ADD COLUMN IF NOT EXISTS "dailyDiscoveryBonus" INTEGER NOT NULL DEFAULT 0`);
    console.log("✓ Guess.dailyDiscoveryBonus");

    await client.query(`
      CREATE TABLE IF NOT EXISTS "VehicleTrivia" (
        "vehicleId" TEXT NOT NULL,
        "displayModel" TEXT,
        "productionYears" TEXT NOT NULL,
        "engine" TEXT,
        "layout" TEXT,
        "regionalNames" TEXT,
        "funFacts" TEXT[],
        "sourceModel" TEXT NOT NULL,
        "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "verifiedByAdmin" BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "VehicleTrivia_pkey" PRIMARY KEY ("vehicleId")
      )
    `);
    console.log("✓ VehicleTrivia");

    await client.query(`
      CREATE TABLE IF NOT EXISTS "FeaturedVehicleOfDay" (
        "date" TIMESTAMP(3) NOT NULL,
        "vehicleId" TEXT NOT NULL,
        "imageId" TEXT NOT NULL,
        "curatedBy" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FeaturedVehicleOfDay_pkey" PRIMARY KEY ("date")
      )
    `);
    console.log("✓ FeaturedVehicleOfDay");

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VehicleTrivia_vehicleId_fkey') THEN
          ALTER TABLE "VehicleTrivia" ADD CONSTRAINT "VehicleTrivia_vehicleId_fkey"
            FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FeaturedVehicleOfDay_vehicleId_fkey') THEN
          ALTER TABLE "FeaturedVehicleOfDay" ADD CONSTRAINT "FeaturedVehicleOfDay_vehicleId_fkey"
            FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FeaturedVehicleOfDay_imageId_fkey') THEN
          ALTER TABLE "FeaturedVehicleOfDay" ADD CONSTRAINT "FeaturedVehicleOfDay_imageId_fkey"
            FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$
    `);
    console.log("✓ foreign keys");

    console.log("\nDone. Now mark the migration as applied:");
    console.log("  DATABASE_URL=<prod-url> npx prisma migrate resolve --applied 20260423130957_add_car_of_the_day");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
