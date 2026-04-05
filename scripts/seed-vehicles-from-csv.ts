/**
 * Seed the Vehicle table from Data1/helper-scripts/car_db.csv.
 *
 * Vehicles are seeded without images — they exist solely to power make/model/trim
 * autocomplete in the admin panel. They will never appear in game rounds because
 * they have no associated Image records.
 *
 * Fields derived from the CSV:
 *   make, model, year, trim (null if blank), bodyStyle, countryOfOrigin
 *
 * Fields inferred:
 *   era       — from year ranges (see ERA_FROM_YEAR)
 *   region    — from country (see COUNTRY_TO_REGION)
 *   rarity    — defaults to "common"
 *
 * Rows are upserted on (make, model, year, trim) so re-running is safe.
 * Rows with unmappable body_type or country are skipped and reported.
 *
 * Usage:
 *   npx tsx scripts/seed-vehicles-from-csv.ts [--dry-run]
 *
 * Required env:
 *   DATABASE_URL
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import type { BodyStyle, Era } from "../app/generated/prisma/client";

const dryRun = process.argv.includes("--dry-run");

// ── Mappings ─────────────────────────────────────────────────────────────────

const BODY_TYPE_MAP: Record<string, BodyStyle> = {
  "Compact": "compact",
  "Sedan": "sedan",
  "Wagon": "wagon",
  "Midsize Station Wagons": "wagon",
  "Pickup": "pickup",
  "Regular Cab 2WD": "pickup",
  "Small Sport Utility Vehicle 2WD": "suv",
  "Small Sport Utility Vehicle 4WD": "suv",
  "Sport Utility Vehicle - 2WD": "suv",
  "Sport Utility Vehicle - 4WD": "suv",
  "Standard Sport Utility Vehicle 2WD": "suv",
  "Standard Sport Utility Vehicle 4WD": "suv",
  "Sports / Roadster": "roadster",
  "Vans Passenger": "van",
  "Special Purpose Vehicles": "special_purpose",
  "Special Purpose Vehicles/2wd": "special_purpose",
};

const COUNTRY_TO_REGION: Record<string, string> = {
  "United States": "north_america",
  "Japan": "jdm",
  "Germany": "europe",
  "France": "europe",
  "Italy": "europe",
  "Sweden": "europe",
  "Netherlands": "europe",
  "Romania": "europe",
  "Yugoslavia": "europe",
  "Russia": "europe",
  "United Kingdom": "uk",
  "South Korea": "east_asia",
  "China": "east_asia",
  "India": "east_asia",
};

function eraFromYear(year: number): Era {
  if (year < 1970) return "classic";
  if (year < 2000) return "retro";
  if (year < 2015) return "modern";
  return "contemporary";
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = path.resolve("Data/helper-scripts/car_db.csv");
  const raw = fs.readFileSync(csvPath, "utf-8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true }) as Array<{
    make: string;
    model: string;
    year: string;
    trim: string;
    body_type: string;
    country: string;
  }>;

  console.log(`Parsed ${rows.length} rows from CSV.`);
  if (dryRun) console.log("Dry run — no DB writes.");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // Ensure all required regions exist
  const regionSlugs = [...new Set(Object.values(COUNTRY_TO_REGION))];
  const regionMap = new Map<string, string>();
  for (const slug of regionSlugs) {
    const region = await prisma.region.upsert({
      where: { slug },
      update: {},
      create: { slug, label: slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) },
    });
    regionMap.set(slug, region.id);
  }

  // Build the full set of candidate records from the CSV
  type VehicleData = {
    make: string; model: string; year: number; trim: string | null;
    countryOfOrigin: string; regionId: string;
    bodyStyle: BodyStyle; era: Era; rarity: "common";
  };

  let skipped = 0;
  const candidates: VehicleData[] = [];

  for (const row of rows) {
    const year = parseInt(row.year, 10);
    if (isNaN(year)) { skipped++; continue; }

    const bodyStyle = BODY_TYPE_MAP[row.body_type];
    if (!bodyStyle) {
      console.warn(`  SKIP (unknown body_type "${row.body_type}"): ${row.make} ${row.model} ${year}`);
      skipped++;
      continue;
    }

    const regionSlug = COUNTRY_TO_REGION[row.country];
    if (!regionSlug) {
      console.warn(`  SKIP (unknown country "${row.country}"): ${row.make} ${row.model} ${year}`);
      skipped++;
      continue;
    }

    candidates.push({
      make: row.make,
      model: row.model,
      year,
      trim: row.trim.trim() || null,
      countryOfOrigin: row.country,
      regionId: regionMap.get(regionSlug)!,
      bodyStyle,
      era: eraFromYear(year),
      rarity: "common",
    });
  }

  console.log(`  ${candidates.length} valid rows, ${skipped} skipped.`);

  if (dryRun) {
    for (const v of candidates.slice(0, 5)) {
      console.log(`  [dry-run] ${v.year} ${v.make} ${v.model}${v.trim ? ` (${v.trim})` : ""} — ${v.bodyStyle} / ${v.era}`);
    }
    if (candidates.length > 5) console.log(`  [dry-run] ... and ${candidates.length - 5} more`);
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  // Fetch all existing (make, model, year, trim) keys in one query to avoid N individual lookups
  const existing = await prisma.vehicle.findMany({
    select: { make: true, model: true, year: true, trim: true },
  });
  const existingKeys = new Set(
    existing.map((v) => `${v.make}|${v.model}|${v.year}|${v.trim ?? ""}`)
  );

  const toInsert = candidates.filter(
    (v) => !existingKeys.has(`${v.make}|${v.model}|${v.year}|${v.trim ?? ""}`)
  );
  console.log(`  ${toInsert.length} new vehicles to insert (${candidates.length - toInsert.length} already exist).`);

  // createMany in batches to avoid hitting DB limits
  const BATCH = 500;
  let inserted = 0; // declared here so it's in scope for the final log
  for (let i = 0; i < toInsert.length; i += BATCH) {
    await prisma.vehicle.createMany({ data: toInsert.slice(i, i + BATCH) });
    inserted += Math.min(BATCH, toInsert.length - i);
    process.stdout.write(`\r  Inserted ${inserted}/${toInsert.length}...`);
  }
  console.log();

  await prisma.$disconnect();
  await pool.end();

  console.log(`\nDone.`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Skipped:  ${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
