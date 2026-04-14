// Eligibility report: counts active images qualifying for each slot in each game mode tier.
import { prisma } from "@/app/lib/prisma";

interface SlotCount {
  slot: string;
  count: bigint | number;
}

export interface EligibilityReport {
  generatedAt: string;
  totalActiveImages: number;
  rookie: {
    pool: number;
    standardPool: number;
    croppedPool: number;
    slotA: number; // isLogoVisible or isModelNameVisible — need 5
    slotB: number; // rarity rare/ultra_rare — need 1
    slotC: number; // isCropped (earns pointsBonus) — need 1
    slotD: number; // fill from standard sub-pool — need 3
  };
  standard: {
    pool: number;
    slotA: number; // isHardcoreEligible — need 1
    slotB: number; // isCropped — need 2
    slotC: number; // rarity rare/ultra_rare — need 1
    slotD: number; // isLogoVisible or isModelNameVisible — need 3
    slotE: number; // fill — need 3
  };
  hardcore: {
    pool: number;
    slotA: number;          // isCropped — need 4
    slotAWithModel: number; // isCropped + isModelNameVisible (max 2 of the 4)
    slotANoModel: number;   // isCropped + !isModelNameVisible (min 2 of the 4)
    slotB: number;          // correctRatio < 0.40 or isHardcoreEligible — need 2
    slotC: number;          // rarity rare/ultra_rare — need 1
    slotD: number;          // isHardcoreEligible — need 2
    slotE: number;          // fill — need 1
  };
}

// Converts the flat CTE result rows into the structured EligibilityReport shape.
// Exported for unit testing without a DB connection.
export function buildReport(
  rows: SlotCount[],
  totalActiveImages: number,
): EligibilityReport {
  const m = new Map(rows.map((r) => [r.slot, Number(r.count)]));
  const get = (key: string) => m.get(key) ?? 0;

  return {
    generatedAt: new Date().toISOString(),
    totalActiveImages,
    rookie: {
      pool:         get("rookie_pool"),
      standardPool: get("rookie_standard_pool"),
      croppedPool:  get("rookie_cropped_pool"),
      slotA:        get("rookie_slot_a"),
      slotB:        get("rookie_slot_b"),
      slotC:        get("rookie_slot_c"),
      slotD:        get("rookie_slot_d"),
    },
    standard: {
      pool:  get("standard_pool"),
      slotA: get("standard_slot_a"),
      slotB: get("standard_slot_b"),
      slotC: get("standard_slot_c"),
      slotD: get("standard_slot_d"),
      slotE: get("standard_slot_e"),
    },
    hardcore: {
      pool:           get("hardcore_pool"),
      slotA:          get("hardcore_slot_a"),
      slotAWithModel: get("hardcore_slot_a_with_model"),
      slotANoModel:   get("hardcore_slot_a_no_model"),
      slotB:          get("hardcore_slot_b"),
      slotC:          get("hardcore_slot_c"),
      slotD:          get("hardcore_slot_d"),
      slotE:          get("hardcore_slot_e"),
    },
  };
}

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
        SELECT 'rookie_pool'         AS slot, COUNT(*) AS count FROM rookie_base
        UNION ALL
        SELECT 'rookie_standard_pool',         COUNT(*) FROM rookie_standard
        UNION ALL
        SELECT 'rookie_cropped_pool',          COUNT(*) FROM rookie_cropped
        UNION ALL
        SELECT 'rookie_slot_a', COUNT(*) FROM rookie_standard
          WHERE "isLogoVisible" OR "isModelNameVisible"
        UNION ALL
        SELECT 'rookie_slot_b', COUNT(*) FROM rookie_standard
          WHERE rarity IN ('rare', 'ultra_rare')
        UNION ALL
        SELECT 'rookie_slot_c', COUNT(*) FROM rookie_cropped
        UNION ALL
        SELECT 'rookie_slot_d', COUNT(*) FROM rookie_standard

        UNION ALL
        SELECT 'standard_pool',       COUNT(*) FROM standard_pool
        UNION ALL
        SELECT 'standard_slot_a', COUNT(*) FROM standard_pool WHERE "isHardcoreEligible"
        UNION ALL
        SELECT 'standard_slot_b', COUNT(*) FROM standard_pool WHERE "isCropped"
        UNION ALL
        SELECT 'standard_slot_c', COUNT(*) FROM standard_pool
          WHERE rarity IN ('rare', 'ultra_rare')
        UNION ALL
        SELECT 'standard_slot_d', COUNT(*) FROM standard_pool
          WHERE "isLogoVisible" OR "isModelNameVisible"
        UNION ALL
        SELECT 'standard_slot_e', COUNT(*) FROM standard_pool

        UNION ALL
        SELECT 'hardcore_pool',       COUNT(*) FROM hardcore_pool
        UNION ALL
        SELECT 'hardcore_slot_a', COUNT(*) FROM hardcore_pool WHERE "isCropped"
        UNION ALL
        SELECT 'hardcore_slot_a_with_model', COUNT(*) FROM hardcore_pool
          WHERE "isCropped" AND "isModelNameVisible"
        UNION ALL
        SELECT 'hardcore_slot_a_no_model', COUNT(*) FROM hardcore_pool
          WHERE "isCropped" AND NOT "isModelNameVisible"
        UNION ALL
        SELECT 'hardcore_slot_b', COUNT(*) FROM hardcore_pool
          WHERE correct_ratio < 0.40 OR "isHardcoreEligible"
        UNION ALL
        SELECT 'hardcore_slot_c', COUNT(*) FROM hardcore_pool
          WHERE rarity IN ('rare', 'ultra_rare')
        UNION ALL
        SELECT 'hardcore_slot_d', COUNT(*) FROM hardcore_pool WHERE "isHardcoreEligible"
        UNION ALL
        SELECT 'hardcore_slot_e', COUNT(*) FROM hardcore_pool
      )

      SELECT slot, count FROM counts ORDER BY slot
    `,
    prisma.image.count({ where: { isActive: true } }),
  ]);

  return Response.json(buildReport(rows, totalActiveImages));
}
