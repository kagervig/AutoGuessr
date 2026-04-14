// Imports Gemini CLI identification results into the staging image table.
//
// Reads a JSON array produced by running gemini-identify-prompt.txt through
// the Gemini CLI, matches each result back to a StagingImage by cloudinaryPublicId
// (extracted from the URL), and writes the ai* fields. Does not overwrite fields
// that have already been set by an admin.
//
// Usage:
//   npx tsx scripts/import-gemini-tags.ts --input gemini-output.json [--dry-run]
//
// Flags:
//   --input FILE   Path to the JSON file output by the Gemini CLI (required)
//   --dry-run      Print what would be written without touching the DB
//
// Required env:
//   DATABASE_URL

import "dotenv/config";
import fs from "fs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

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

interface GeminiResult {
  index: number;
  url: string;
  make: string;
  model: string;
  year: number | null;
  trim: string;
  body_style: string;
  confidence: number;
  is_logo_visible: boolean;
  is_model_name_visible: boolean;
  has_multiple_vehicles: boolean;
  is_face_visible: boolean;
  is_vehicle_unmodified: boolean;
  notes: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Cloudinary upload URLs look like:
//   https://res.cloudinary.com/<cloud>/image/upload/<public_id>
// The public_id can itself contain slashes (folder paths).
function extractPublicId(url: string): string | null {
  const marker = "/image/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: file not found: ${inputFile}`);
    process.exit(1);
  }

  let results: GeminiResult[];
  try {
    results = JSON.parse(fs.readFileSync(inputFile, "utf-8")) as GeminiResult[];
  } catch (err) {
    console.error(`Error: could not parse ${inputFile} as JSON:`, err);
    process.exit(1);
  }

  if (!Array.isArray(results) || results.length === 0) {
    console.error("Error: expected a non-empty JSON array");
    process.exit(1);
  }

  console.log(`Loaded ${results.length} result(s) from ${inputFile}${isDryRun ? " (dry run)" : ""}`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const db = new PrismaClient({ adapter });

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const result of results) {
    const publicId = extractPublicId(result.url);
    if (!publicId) {
      console.warn(`[${result.index}] Could not extract public ID from URL: ${result.url}`);
      skipped++;
      continue;
    }

    const record = await db.stagingImage.findUnique({
      where: { cloudinaryPublicId: publicId },
    });

    if (!record) {
      console.warn(`[${result.index}] No StagingImage found for: ${publicId}`);
      notFound++;
      continue;
    }

    if (record.status === "PUBLISHED" || record.status === "REJECTED") {
      console.log(`[${result.index}] Skipping — status is ${record.status}: ${publicId}`);
      skipped++;
      continue;
    }

    const yearStr = result.year ? String(result.year) : "?";
    console.log(
      `[${result.index}] ${result.make || "?"} ${result.model || "?"} ${yearStr}` +
      ` (confidence: ${result.confidence})` +
      (result.notes ? ` — ${result.notes}` : "")
    );

    if (!isDryRun) {
      await db.stagingImage.update({
        where: { id: record.id },
        data: {
          aiMake:       result.make || null,
          aiModel:      result.model || null,
          aiYear:       result.year,
          aiBodyStyle:  result.body_style || null,
          aiConfidence: result.confidence,
          aiTaggedAt:   new Date(),
          // Boolean flags: only write if admin hasn't already set them
          ...(record.adminIsLogoVisible       === null ? { adminIsLogoVisible:       result.is_logo_visible       } : {}),
          ...(record.adminIsModelNameVisible  === null ? { adminIsModelNameVisible:  result.is_model_name_visible } : {}),
          ...(record.adminHasMultipleVehicles === null ? { adminHasMultipleVehicles: result.has_multiple_vehicles } : {}),
          ...(record.adminIsFaceVisible       === null ? { adminIsFaceVisible:       result.is_face_visible       } : {}),
          ...(record.adminIsVehicleUnmodified === null ? { adminIsVehicleUnmodified: result.is_vehicle_unmodified } : {}),
          // Notes: only write if admin hasn't already entered something
          ...(record.adminNotes === null && result.notes
            ? { adminNotes: `[AI] ${result.notes}` }
            : {}),
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
