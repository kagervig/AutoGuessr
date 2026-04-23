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

const limitArg = args.indexOf("--limit");
const limit = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : Infinity;

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
  adminMake: string;
  adminModel: string;
  adminYear: string;
  adminTrim: string;
  adminBodyStyle: string;
  adminNotes: string;
  adminCategories: string;
  adminEra: string;
  adminIsHardcoreEligible: string;
  adminRarity: string;
  adminRegionSlug: string;
  adminCountryOfOrigin: string;
  adminCopyrightHolder: string;
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

// Postgres array exports as "{val1,val2}".
function parsePostgresArray(value: string): string[] {
  if (!value || value === "{}") return [];
  return value.replace(/^\{|\}$/g, "").split(",").filter(Boolean);
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

  for (const row of rows.slice(0, limit)) {
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

    const categories = parsePostgresArray(row.adminCategories);

    console.log(
      `[${row.id}] ${row.aiMake} ${row.aiModel} ${row.aiYear ?? "?"}` +
        (confidence !== null ? ` (confidence: ${confidence})` : "") +
        (origin ? ` [${origin.countryOfOrigin}/${origin.regionSlug}]` : "") +
        ` bodyStyle=${JSON.stringify(row.aiBodyStyle)} adminBodyStyle=${JSON.stringify(row.adminBodyStyle)}`
    );

    if (isDryRun) {
      const adminFields: Record<string, unknown> = {};
      if (row.adminMake)            adminFields.adminMake = row.adminMake;
      if (row.adminModel)           adminFields.adminModel = row.adminModel;
      if (row.adminYear)            adminFields.adminYear = parseInt(row.adminYear, 10);
      if (row.adminTrim)            adminFields.adminTrim = row.adminTrim;
      if (row.adminBodyStyle || row.aiBodyStyle) adminFields.adminBodyStyle = (row.adminBodyStyle || row.aiBodyStyle).toLowerCase().replace(/ /g, "_");
      if (row.adminNotes)           adminFields.adminNotes = row.adminNotes;
      if (categories.length)        adminFields.adminCategories = categories;
      if (row.adminEra)             adminFields.adminEra = row.adminEra.toLowerCase();
      if (row.adminRarity)          adminFields.adminRarity = row.adminRarity.toLowerCase().replace(/ /g, "_");
      if (row.adminRegionSlug)      adminFields.adminRegionSlug = row.adminRegionSlug;
      else if (origin)              adminFields.adminRegionSlug = origin.regionSlug;
      if (row.adminCountryOfOrigin) adminFields.adminCountryOfOrigin = row.adminCountryOfOrigin;
      else if (origin)              adminFields.adminCountryOfOrigin = origin.countryOfOrigin;
      if (row.adminCopyrightHolder) adminFields.adminCopyrightHolder = row.adminCopyrightHolder;
      const hc = parseBool(row.adminIsHardcoreEligible);
      if (hc !== null)              adminFields.adminIsHardcoreEligible = hc;
      console.log("  Would write:", JSON.stringify(adminFields, null, 2));
    }

    if (!isDryRun) {
      const result = await db.stagingImage.update({
        where: { id: record.id },
        data: {
          aiMake:       row.aiMake || null,
          aiModel:      row.aiModel || null,
          aiYear:       year,
          aiBodyStyle:  row.aiBodyStyle || null,
          aiConfidence: confidence,
          aiTaggedAt:   taggedAt,
          ...(row.adminMake              ? { adminMake: row.adminMake }                       : {}),
          ...(row.adminModel             ? { adminModel: row.adminModel }                     : {}),
          ...(row.adminYear              ? { adminYear: parseInt(row.adminYear, 10) }         : {}),
          ...(row.adminTrim              ? { adminTrim: row.adminTrim }                       : {}),
          ...(row.adminBodyStyle || row.aiBodyStyle ? { adminBodyStyle: (row.adminBodyStyle || row.aiBodyStyle).toLowerCase().replace(/ /g, "_") } : {}),
          ...(row.adminNotes             ? { adminNotes: row.adminNotes }                     : {}),
          ...(categories.length          ? { adminCategories: categories }                   : {}),
          ...(row.adminEra               ? { adminEra: row.adminEra.toLowerCase() }                         : {}),
          ...(row.adminRarity            ? { adminRarity: row.adminRarity.toLowerCase().replace(/ /g, "_") } : {}),
          ...(row.adminRegionSlug        ? { adminRegionSlug: row.adminRegionSlug }           : origin ? { adminRegionSlug: origin.regionSlug } : {}),
          ...(row.adminCountryOfOrigin   ? { adminCountryOfOrigin: row.adminCountryOfOrigin } : origin ? { adminCountryOfOrigin: origin.countryOfOrigin } : {}),
          ...(row.adminCopyrightHolder   ? { adminCopyrightHolder: row.adminCopyrightHolder } : {}),
          ...(parseBool(row.adminIsHardcoreEligible) !== null ? { adminIsHardcoreEligible: parseBool(row.adminIsHardcoreEligible) } : {}),
          ...(parseBool(row.adminIsCropped)           !== null ? { adminIsCropped: parseBool(row.adminIsCropped) }                 : {}),
          ...(parseBool(row.adminIsLogoVisible)       !== null ? { adminIsLogoVisible: parseBool(row.adminIsLogoVisible) }         : {}),
          ...(parseBool(row.adminIsModelNameVisible)  !== null ? { adminIsModelNameVisible: parseBool(row.adminIsModelNameVisible) } : {}),
          ...(parseBool(row.adminHasMultipleVehicles) !== null ? { adminHasMultipleVehicles: parseBool(row.adminHasMultipleVehicles) } : {}),
          ...(parseBool(row.adminIsFaceVisible)       !== null ? { adminIsFaceVisible: parseBool(row.adminIsFaceVisible) }         : {}),
          ...(parseBool(row.adminIsVehicleUnmodified) !== null ? { adminIsVehicleUnmodified: parseBool(row.adminIsVehicleUnmodified) } : {}),
        },
      });
      console.log(`  → DB adminBodyStyle: ${JSON.stringify(result.adminBodyStyle)}, aiBodyStyle: ${JSON.stringify(result.aiBodyStyle)}`);
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
