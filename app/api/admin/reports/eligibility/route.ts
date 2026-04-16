// Eligibility report: counts active images qualifying for each slot in each game mode tier.
import { prisma } from "@/app/lib/prisma";
import { buildReport, type SlotCount } from "./types";
export type { EligibilityReport } from "./types";

export async function GET() {
  // correctRatio and totalServes are computed on the fly because the schema migration
  // that adds those stored columns (Step 1 of tiered-image-selection) may not have run yet.
  // Once it lands, these CTEs can be simplified to read the stored columns directly.
  const [rows, totalActiveImages] = await Promise.all([
    prisma.$queryRaw<SlotCount[]>`
      WITH base AS (
        -- All active images with vehicle rarity and on-the-fly stats.
        -- No LIMIT — the 300-image greedy fetch is a game-time optimisation only.
        SELECT
          i.id,
          i."isCropped",
          i."isLogoVisible",
          i."isModelNameVisible",
          i."isHardcoreEligible",
          v.rarity,
          v.make,
          v.model,
          COALESCE(s."correctGuesses",   0) AS correct_guesses,
          COALESCE(s."incorrectGuesses", 0) AS incorrect_guesses,
          CASE
            WHEN COALESCE(s."incorrectGuesses", 0) = 0 THEN 1.0
            ELSE CAST(COALESCE(s."correctGuesses", 0) AS FLOAT) / COALESCE(s."incorrectGuesses", 0)
          END AS correct_ratio,
          (
            s."imageId" IS NULL
            OR COALESCE(s."correctGuesses", 0) + COALESCE(s."incorrectGuesses", 0) = 0
          ) AS never_shown
        FROM "Image" i
        JOIN "Vehicle" v ON v.id = i."vehicleId"
        LEFT JOIN "ImageStats" s ON s."imageId" = i.id
        WHERE i."isActive" = true
      ),

      rookie_base AS (
        SELECT * FROM base
        WHERE (correct_ratio > 0.75 OR never_shown) AND NOT "isHardcoreEligible"
      ),
      rookie_standard AS (SELECT * FROM rookie_base WHERE NOT "isCropped"),
      rookie_cropped   AS (SELECT * FROM rookie_base WHERE "isCropped"),

      standard_pool AS (
        SELECT * FROM base WHERE correct_ratio > 0.50 OR never_shown
      ),

      hardcore_pool AS (
        SELECT * FROM base WHERE correct_ratio < 0.80 OR never_shown
      ),

      counts AS (
        SELECT 'rookie_pool'         AS slot, COUNT(*) AS count, COUNT(DISTINCT make || '|' || model) AS distinct_makes FROM rookie_base
        UNION ALL
        SELECT 'rookie_standard_pool',         COUNT(*), COUNT(DISTINCT make || '|' || model) FROM rookie_standard
        UNION ALL
        SELECT 'rookie_cropped_pool',          COUNT(*), COUNT(DISTINCT make || '|' || model) FROM rookie_cropped
        UNION ALL
        SELECT 'rookie_slot_a', COUNT(*), COUNT(DISTINCT make || '|' || model) FROM rookie_standard
          WHERE "isLogoVisible" OR "isModelNameVisible"
        UNION ALL
        SELECT 'rookie_slot_b', COUNT(*), COUNT(DISTINCT make || '|' || model) FROM rookie_standard
          WHERE rarity IN ('rare', 'ultra_rare')
        UNION ALL
        SELECT 'rookie_slot_c', COUNT(*), COUNT(DISTINCT make || '|' || model) FROM rookie_cropped
        UNION ALL
        SELECT 'rookie_slot_d', COUNT(*), COUNT(DISTINCT make || '|' || model) FROM rookie_standard

        UNION ALL
        SELECT 'standard_pool',       COUNT(*), COUNT(DISTINCT make || '|' || model) FROM standard_pool
        UNION ALL
        SELECT 'standard_slot_a', COUNT(*), COUNT(DISTINCT make || '|' || model) FROM standard_pool WHERE "isHardcoreEligible"
        UNION ALL
        SELECT 'standard_slot_b', COUNT(*), COUNT(DISTINCT make || '|' || model) FROM standard_pool WHERE "isCropped"
        UNION ALL
        SELECT 'standard_slot_c', COUNT(*), COUNT(DISTINCT make || '|' || model) FROM standard_pool
          WHERE rarity IN ('rare', 'ultra_rare')
        UNION ALL
        SELECT 'standard_slot_d', COUNT(*), COUNT(DISTINCT make || '|' || model) FROM standard_pool
          WHERE "isLogoVisible" OR "isModelNameVisible"
        UNION ALL
        SELECT 'standard_slot_e', COUNT(*), COUNT(DISTINCT make || '|' || model) FROM standard_pool

        UNION ALL
        SELECT 'hardcore_pool',       COUNT(*), COUNT(DISTINCT make || '|' || model) FROM hardcore_pool
        UNION ALL
        SELECT 'hardcore_slot_a', COUNT(*), COUNT(DISTINCT make || '|' || model) FROM hardcore_pool WHERE "isCropped"
        UNION ALL
        SELECT 'hardcore_slot_a_with_model', COUNT(*), COUNT(DISTINCT make || '|' || model) FROM hardcore_pool
          WHERE "isCropped" AND "isModelNameVisible"
        UNION ALL
        SELECT 'hardcore_slot_a_no_model', COUNT(*), COUNT(DISTINCT make || '|' || model) FROM hardcore_pool
          WHERE "isCropped" AND NOT "isModelNameVisible"
        UNION ALL
        SELECT 'hardcore_slot_b', COUNT(*), COUNT(DISTINCT make || '|' || model) FROM hardcore_pool
          WHERE correct_ratio < 0.40 OR "isHardcoreEligible"
        UNION ALL
        SELECT 'hardcore_slot_c', COUNT(*), COUNT(DISTINCT make || '|' || model) FROM hardcore_pool
          WHERE rarity IN ('rare', 'ultra_rare')
        UNION ALL
        SELECT 'hardcore_slot_d', COUNT(*), COUNT(DISTINCT make || '|' || model) FROM hardcore_pool WHERE "isHardcoreEligible"
        UNION ALL
        SELECT 'hardcore_slot_e', COUNT(*), COUNT(DISTINCT make || '|' || model) FROM hardcore_pool
      )

      SELECT slot, count, distinct_makes FROM counts ORDER BY slot
    `,
    prisma.image.count({ where: { isActive: true } }),
  ]);

  return Response.json(buildReport(rows, totalActiveImages));
}
