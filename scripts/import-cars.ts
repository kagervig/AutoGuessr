/**
 * Car image import script.
 *
 * Usage:
 *   npx tsx scripts/import-cars.ts --file ./cars.csv [--dry-run] [--skip-existing]
 *
 * CSV columns (header row required):
 *   make, model, year, trim, country_of_origin, region_slug, body_style, era, rarity,
 *   categories, source_url, attribution, is_hardcore_eligible, image_path
 *
 * - categories: comma-separated category slugs (e.g. "supercar,classic")
 * - is_hardcore_eligible: "true" or "false"
 * - image_path: path to the local image file (absolute or relative to the CSV file's directory)
 *
 * Images are uploaded to Cloudinary as WebP, quality auto, max 1200px wide.
 * Each row creates/updates one Vehicle, upserts VehicleCategory join rows,
 * and creates one Image + ImageStats record (skipped if already exists).
 *
 * Flags:
 *   --dry-run        Log what would be done without writing to Cloudinary or the database.
 *   --skip-existing  Skip rows where a matching Vehicle + Image already exists in the DB.
 *
 * Required environment variables (or .env file):
 *   DATABASE_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { createReadStream } from "fs";
import { parse } from "csv-parse/sync";
import { v2 as cloudinary } from "cloudinary";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import type { BodyStyle, Era, Rarity } from "../app/generated/prisma/client";

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const fileIndex = args.indexOf("--file");
const csvFile = fileIndex !== -1 ? args[fileIndex + 1] : "./cars.csv";
const dryRun = args.includes("--dry-run");
const skipExisting = args.includes("--skip-existing");

if (!fs.existsSync(csvFile)) {
  console.error(`CSV file not found: ${csvFile}`);
  process.exit(1);
}

const csvDir = path.dirname(path.resolve(csvFile));

// ── Types ─────────────────────────────────────────────────────────────────────

interface CsvRow {
  make: string;
  model: string;
  year: string;
  trim: string;
  country_of_origin: string;
  region_slug: string;
  body_style: string;
  era: string;
  rarity: string;
  categories: string;
  source_url: string;
  attribution: string;
  is_hardcore_eligible: string;
  image_path: string;
}

// ── Cloudinary setup ──────────────────────────────────────────────────────────

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface UploadResult {
  publicId: string;
  originalBytes: number;
  cloudinaryBytes: number;
}

async function uploadImage(
  filePath: string,
  vehicleId: string,
  index: number
): Promise<UploadResult> {
  const originalBytes = fs.statSync(filePath).size;
  const publicId = `autoguessr/vehicles/${vehicleId}/${index}`;

  // Check if already uploaded to Cloudinary
  try {
    const existing = await cloudinary.api.resource(publicId, { resource_type: "image" });
    return { publicId: existing.public_id, originalBytes, cloudinaryBytes: existing.bytes };
  } catch {
    // Not found — proceed with upload
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: "image",
        format: "webp",
        quality: "auto",
        transformation: [{ width: 1200, crop: "limit" }],
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("No result from Cloudinary"));
        } else {
          resolve({ publicId: result.public_id, originalBytes, cloudinaryBytes: result.bytes });
        }
      }
    );
    createReadStream(filePath).pipe(stream);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const raw = fs.readFileSync(csvFile, "utf-8");
  const rows: CsvRow[] = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  console.log(`Found ${rows.length} row(s) in CSV.`);

  if (dryRun) console.log("Dry run — no changes will be written.");
  if (skipExisting) console.log("--skip-existing: matching Vehicle+Image rows will be skipped.");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  let vehiclesUpserted = 0;
  let imagesUploaded = 0;
  let imagesSkipped = 0;
  let errors = 0;

  for (const row of rows) {
    const vehicleKey = {
      make: row.make,
      model: row.model,
      year: parseInt(row.year, 10),
      trim: row.trim || null,
    };
    const label = `${vehicleKey.year} ${vehicleKey.make} ${vehicleKey.model}${vehicleKey.trim ? ` (${vehicleKey.trim})` : ""}`;
    console.log(`\nProcessing: ${label}`);

    // Validate image path
    const imagePath = path.isAbsolute(row.image_path)
      ? row.image_path
      : path.join(csvDir, row.image_path);

    if (!fs.existsSync(imagePath)) {
      console.warn(`  Image not found: ${imagePath} — skipping row`);
      errors++;
      continue;
    }

    // Look up region
    const region = await prisma.region.findUnique({ where: { slug: row.region_slug } });
    if (!region) {
      console.warn(`  Region not found: ${row.region_slug} — skipping row`);
      errors++;
      continue;
    }

    // Look up categories
    const categorySlugs = row.categories
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const categories = await prisma.category.findMany({
      where: { slug: { in: categorySlugs } },
    });
    if (categories.length !== categorySlugs.length) {
      const missing = categorySlugs.filter((s) => !categories.find((c) => c.slug === s));
      console.warn(`  Missing categories: ${missing.join(", ")} — skipping row`);
      errors++;
      continue;
    }

    if (dryRun) {
      console.log(`  [dry-run] Would upsert vehicle and upload ${imagePath}`);
      continue;
    }

    // Upsert vehicle
    const existingVehicle = await prisma.vehicle.findFirst({ where: vehicleKey });
    const vehicle = await prisma.vehicle.upsert({
      where: { id: existingVehicle?.id ?? "nonexistent" },
      update: {
        countryOfOrigin: row.country_of_origin,
        regionId: region.id,
        bodyStyle: row.body_style as BodyStyle,
        era: row.era as Era,
        rarity: row.rarity as Rarity,
      },
      create: {
        ...vehicleKey,
        countryOfOrigin: row.country_of_origin,
        regionId: region.id,
        bodyStyle: row.body_style as BodyStyle,
        era: row.era as Era,
        rarity: row.rarity as Rarity,
      },
    });
    vehiclesUpserted++;

    // Sync category associations
    await prisma.vehicleCategory.deleteMany({ where: { vehicleId: vehicle.id } });
    await prisma.vehicleCategory.createMany({
      data: categories.map((c) => ({ vehicleId: vehicle.id, categoryId: c.id })),
    });

    // Skip if a matching image already exists
    const imageFilename = path.basename(imagePath);
    const existingImage = await prisma.image.findFirst({
      where: { vehicleId: vehicle.id, filename: { contains: imageFilename } },
    });
    if (skipExisting && existingImage) {
      console.log(`  Skipping existing image: ${imageFilename}`);
      imagesSkipped++;
      continue;
    }

    // Count how many images this vehicle already has (for Cloudinary public_id index)
    const imageCount = await prisma.image.count({ where: { vehicleId: vehicle.id } });

    // Upload to Cloudinary
    console.log(`  Uploading: ${imageFilename}`);
    let uploadResult: UploadResult;
    try {
      uploadResult = await uploadImage(imagePath, vehicle.id, imageCount);
      const savings = Math.round((1 - uploadResult.cloudinaryBytes / uploadResult.originalBytes) * 100);
      console.log(
        `  Uploaded as: ${uploadResult.publicId} | original: ${(uploadResult.originalBytes / 1024).toFixed(1)}KB → optimised: ${(uploadResult.cloudinaryBytes / 1024).toFixed(1)}KB (${savings}% smaller)`
      );
    } catch (err) {
      console.error(`  Upload failed for ${imageFilename}:`, err);
      errors++;
      continue;
    }

    // Create Image + ImageStats records
    const createdImage = await prisma.image.create({
      data: {
        vehicleId: vehicle.id,
        filename: uploadResult.publicId,
        sourceUrl: row.source_url || null,
        isActive: true,
        isHardcoreEligible: row.is_hardcore_eligible.toLowerCase() === "true",
      },
    });
    await prisma.imageStats.create({
      data: {
        imageId: createdImage.id,
        correctGuesses: 0,
        incorrectGuesses: 0,
      },
    });
    imagesUploaded++;
  }

  await prisma.$disconnect();
  await pool.end();

  console.log(`\nDone.`);
  console.log(`  Vehicles upserted: ${vehiclesUpserted}`);
  console.log(`  Images uploaded:   ${imagesUploaded}`);
  console.log(`  Images skipped:    ${imagesSkipped}`);
  if (errors > 0) console.warn(`  Errors:            ${errors}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
