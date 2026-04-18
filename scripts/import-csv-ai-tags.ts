// Imports AI vehicle tags from a CSV export into the StagingImage table.
//
// Reads a CSV file (exported from the staging images admin view), matches each
// row to a StagingImage by its `id` column, and writes the ai* fields. Only
// processes rows with status PENDING_REVIEW. Does not overwrite boolean admin
// flags that have already been set manually.
//
// Usage:
//   npx tsx scripts/import-csv-ai-tags.ts --input ./images_to_process.csv [--dry-run]
//
// Flags:
//   --input FILE   Path to the CSV file (required)
//   --dry-run      Print what would be written without touching the DB
//
// Required env:
//   DATABASE_URL

import "dotenv/config";
import fs from "fs";
import { parse } from "csv-parse/sync";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { lookupMakeOrigin } from "./lib/make-origins";

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

const inputArg = args.indexOf("--input");
if (inputArg === -1 || !args[inputArg + 1]) {
  console.error("Error: --input <file> is required");
  process.exit(1);
}
const inputFile = args[inputArg + 1];
const isDryRun = args.includes("--dry-run");

// ── Types ─────────────────────────────────────────────────────────────────────

interface CsvRow {
  id: string;
  cloudinaryPublicId: string;
  aiMake: string;
  aiModel: string;
  aiYear: string;
  aiBodyStyle: string;
  aiConfidence: string;
  aiTaggedAt: string;
  status: string;
  adminIsCropped: string;
  adminIsLogoVisible: string;
  adminIsModelNameVisible: string;
  adminHasMultipleVehicles: string;
  adminIsFaceVisible: string;
  adminIsVehicleUnmodified: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Postgres boolean exports as "t"/"f"; also accept "true"/"false".
function parseBool(value: string): boolean | null {
  if (value === "t" || value === "true") return true;
  if (value === "f" || value === "false") return false;
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: file not found: ${inputFile}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputFile, "utf-8");
  const rows: CsvRow[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Loaded ${rows.length} row(s) from ${inputFile}${isDryRun ? " (dry run)" : ""}`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const db = new PrismaClient({ adapter });

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const row of rows) {
    if (row.status !== "PENDING_REVIEW") {
      skipped++;
      continue;
    }

    if (!row.aiMake) {
      console.log(`[${row.id}] Skipping — no AI tags`);
      skipped++;
      continue;
    }

    const record = await db.stagingImage.findUnique({ where: { id: row.id } });

    if (!record) {
      console.warn(`[${row.id}] Not found in DB`);
      notFound++;
      continue;
    }

    const year = row.aiYear ? parseInt(row.aiYear, 10) : null;
    const confidence = row.aiConfidence ? parseFloat(row.aiConfidence) : null;
    const taggedAt = row.aiTaggedAt ? new Date(row.aiTaggedAt) : null;
    const origin = lookupMakeOrigin(row.aiMake);

    if (!origin) {
      console.warn(`[${row.id}] Unknown make, skipping region/country: ${row.aiMake}`);
    }

    console.log(
      `[${row.id}] ${row.aiMake} ${row.aiModel} ${row.aiYear ?? "?"}` +
        (confidence !== null ? ` (confidence: ${confidence})` : "") +
        (origin ? ` [${origin.countryOfOrigin}/${origin.regionSlug}]` : "")
    );

    if (!isDryRun) {
      await db.stagingImage.update({
        where: { id: record.id },
        data: {
          aiMake: row.aiMake || null,
          aiModel: row.aiModel || null,
          aiYear: year,
          aiBodyStyle: row.aiBodyStyle || null,
          aiConfidence: confidence,
          aiTaggedAt: taggedAt,
          adminCopyrightHolder: "Pexels",
          ...(origin ? { adminRegionSlug: origin.regionSlug, adminCountryOfOrigin: origin.countryOfOrigin } : {}),
          ...(parseBool(row.adminIsCropped) !== null ? { adminIsCropped: parseBool(row.adminIsCropped) } : {}),
          ...(parseBool(row.adminIsLogoVisible) !== null ? { adminIsLogoVisible: parseBool(row.adminIsLogoVisible) } : {}),
          ...(parseBool(row.adminIsModelNameVisible) !== null ? { adminIsModelNameVisible: parseBool(row.adminIsModelNameVisible) } : {}),
          ...(parseBool(row.adminHasMultipleVehicles) !== null ? { adminHasMultipleVehicles: parseBool(row.adminHasMultipleVehicles) } : {}),
          ...(parseBool(row.adminIsFaceVisible) !== null ? { adminIsFaceVisible: parseBool(row.adminIsFaceVisible) } : {}),
          ...(parseBool(row.adminIsVehicleUnmodified) !== null ? { adminIsVehicleUnmodified: parseBool(row.adminIsVehicleUnmodified) } : {}),
        },
      });
      updated++;
    } else {
      updated++;
    }
  }

  await db.$disconnect();
  await pool.end();

  console.log(`\nDone.`);
  console.log(`  Updated:   ${updated}`);
  console.log(`  Skipped:   ${skipped}`);
  console.log(`  Not found: ${notFound}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
