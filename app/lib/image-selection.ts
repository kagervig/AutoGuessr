// Tiered image selection for easy (Rookie), standard, and hardcore game modes.

import { Prisma } from "../generated/prisma/client";
import { prisma } from "./prisma";
import { shuffle } from "./game";
import { GameMode } from "./constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Shape returned by the Prisma raw queries in selectTieredImages.
// stats is null for images that have never been served.
export type RawImage = {
  id: string;
  filename: string;
  vehicleId: string;
  isCropped: boolean;
  isLogoVisible: boolean;
  isModelNameVisible: boolean;
  isHardcoreEligible: boolean;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    era: string;
    rarity: string;
  };
  stats: {
    totalServes: number;
    correctRatio: number; // correctGuesses / (correctGuesses + incorrectGuesses)
    thumbsUp: number;
  } | null;
};

export type ScoredImage = RawImage & {
  totalServes: number;
  correctRatio: number;
  selectionWeight: number; // 1.5 if thumbsUp > 0, else 1.0
};

export type SelectedImage = ScoredImage & {
  pointsBonus?: true; // set on the cropped pick in Rookie slot C
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Promotes stats fields to top-level for ergonomic access in tier filters.
export function deriveMetrics(images: RawImage[]): ScoredImage[] {
  return images.map((img) => ({
    ...img,
    totalServes: img.stats?.totalServes ?? 0,
    correctRatio: img.stats?.correctRatio ?? 1.0,
    selectionWeight: (img.stats?.thumbsUp ?? 0) > 0 ? 1.5 : 1.0,
  }));
}

// Returns the pool filtered to images whose make+model is not already in selected.
export function excluding(pool: ScoredImage[], selected: ScoredImage[]): ScoredImage[] {
  const pairs = new Set(
    selected.map((img) => `${img.vehicle.make}|${img.vehicle.model}`)
  );
  return pool.filter((img) => !pairs.has(`${img.vehicle.make}|${img.vehicle.model}`));
}

// Picks n distinct images using weighted random selection.
// Items with higher selectionWeight are proportionally more likely to be chosen.
export function pickWeighted(pool: ScoredImage[], n: number): ScoredImage[] {
  const remaining = [...pool];
  const result: ScoredImage[] = [];

  for (let i = 0; i < n && remaining.length > 0; i++) {
    const totalWeight = remaining.reduce((sum, img) => sum + img.selectionWeight, 0);
    let rand = Math.random() * totalWeight;
    let chosen = remaining.length - 1; // default to last if float math lands past all buckets
    for (let j = 0; j < remaining.length; j++) {
      rand -= remaining[j].selectionWeight;
      if (rand <= 0) {
        chosen = j;
        break;
      }
    }
    result.push(remaining[chosen]);
    remaining.splice(chosen, 1);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Tier selection functions
// ---------------------------------------------------------------------------

export function selectRookieImages(pool: ScoredImage[]): SelectedImage[] {
  const rookieBase = pool.filter(
    (img) => (img.correctRatio > 0.75 || img.totalServes === 0) && !img.isHardcoreEligible
  );
  const rookieStandardPool = rookieBase.filter((img) => !img.isCropped);
  const rookieCroppedPool = rookieBase.filter((img) => img.isCropped);

  const selected: SelectedImage[] = [];

  // Slot A: 5× make/model-visible
  const slotAPool = rookieStandardPool.filter(
    (img) => img.isLogoVisible || img.isModelNameVisible
  );
  selected.push(...pickWeighted(excluding(slotAPool, selected), 5));

  // Slot B: 1× rare or ultra-rare vehicle
  const slotBPool = rookieStandardPool.filter(
    (img) => img.vehicle.rarity === "rare" || img.vehicle.rarity === "ultra_rare"
  );
  selected.push(...pickWeighted(excluding(slotBPool, selected), 1));

  // Slot C: 1× cropped image with pointsBonus; falls back to make/model-visible if none available
  const availableCropped = excluding(rookieCroppedPool, selected);
  if (availableCropped.length > 0) {
    const [cropped] = pickWeighted(availableCropped, 1);
    selected.push({ ...cropped, pointsBonus: true });
  } else {
    selected.push(...pickWeighted(excluding(slotAPool, selected), 1));
  }

  // Slot D: 3× weighted filler
  selected.push(...pickWeighted(excluding(rookieStandardPool, selected), 3));

  // Constraint: at least 40% of selected images must be make/model-visible.
  // Swap lowest-weight non-visible images for visible ones if threshold is not met.
  if (selected.length > 0) {
    const makeModelCount = selected.filter(
      (img) => img.isLogoVisible || img.isModelNameVisible
    ).length;
    if (makeModelCount / selected.length < 0.4) {
      const needed = Math.ceil(selected.length * 0.4) - makeModelCount;
      const replacements = pickWeighted(excluding(slotAPool, selected), needed);
      const nonVisible = selected
        .filter((img) => !img.isLogoVisible && !img.isModelNameVisible)
        .sort((a, b) => a.selectionWeight - b.selectionWeight);
      for (let i = 0; i < Math.min(replacements.length, nonVisible.length); i++) {
        const idx = selected.indexOf(nonVisible[i]);
        if (idx !== -1) selected.splice(idx, 1, replacements[i]);
      }
      if (replacements.length < needed) {
        console.warn(`[image-selection] Rookie: make/model constraint unsatisfied (needed ${needed} swaps, got ${replacements.length})`);
      }
    }
  }

  return shuffle(selected) as SelectedImage[];
}

export function selectStandardImages(pool: ScoredImage[]): SelectedImage[] {
  const standardPool = pool.filter(
    (img) => img.correctRatio > 0.5 || img.totalServes === 0
  );

  const selected: SelectedImage[] = [];

  // Slot A: 1× hardcore-eligible
  const slotAPool = standardPool.filter((img) => img.isHardcoreEligible);
  selected.push(...pickWeighted(excluding(slotAPool, selected), 1));

  // Slot B: 2× cropped
  const slotBPool = standardPool.filter((img) => img.isCropped);
  selected.push(...pickWeighted(excluding(slotBPool, selected), 2));

  // Slot C: 1× rare or ultra-rare vehicle
  const slotCPool = standardPool.filter(
    (img) => img.vehicle.rarity === "rare" || img.vehicle.rarity === "ultra_rare"
  );
  selected.push(...pickWeighted(excluding(slotCPool, selected), 1));

  // Slot D: 3× make/model-visible
  const slotDPool = standardPool.filter(
    (img) => img.isLogoVisible || img.isModelNameVisible
  );
  selected.push(...pickWeighted(excluding(slotDPool, selected), 3));

  // Slot E: 3× weighted filler
  selected.push(...pickWeighted(excluding(standardPool, selected), 3));

  // Constraint: at least 30% must be make/model-visible
  if (selected.length > 0) {
    const makeModelCount = selected.filter(
      (img) => img.isLogoVisible || img.isModelNameVisible
    ).length;
    if (makeModelCount / selected.length < 0.3) {
      const needed = Math.ceil(selected.length * 0.3) - makeModelCount;
      const replacements = pickWeighted(excluding(slotDPool, selected), needed);
      const nonVisible = selected
        .filter((img) => !img.isLogoVisible && !img.isModelNameVisible)
        .sort((a, b) => a.selectionWeight - b.selectionWeight);
      for (let i = 0; i < Math.min(replacements.length, nonVisible.length); i++) {
        const idx = selected.indexOf(nonVisible[i]);
        if (idx !== -1) selected.splice(idx, 1, replacements[i]);
      }
      if (replacements.length < needed) {
        console.warn(`[image-selection] Standard: make/model constraint unsatisfied (needed ${needed} swaps, got ${replacements.length})`);
      }
    }
  }

  return shuffle(selected) as SelectedImage[];
}

export function selectHardcoreImages(pool: ScoredImage[]): SelectedImage[] {
  const hardcorePool = pool.filter(
    (img) => img.correctRatio < 0.8 || img.totalServes === 0
  );

  const selected: SelectedImage[] = [];
  // Images dropped from slot A due to the model-name-visible cap; excluded from all later slots
  // so the cap cannot be bypassed by filler picks.
  const slotARejected: ScoredImage[] = [];

  // Helper: exclude both already-selected and slot-A-rejected images by make+model
  const excl = (p: ScoredImage[]) => excluding(excluding(p, selected), slotARejected);

  // Slot A: 4× cropped, with at most 2 having isModelNameVisible
  const croppedPool = hardcorePool.filter((img) => img.isCropped);
  const slotA = pickWeighted(excl(croppedPool), 4);

  const modelNameCount = slotA.filter((img) => img.isModelNameVisible).length;
  if (modelNameCount > 2) {
    const excess = modelNameCount - 2;
    const withModel = slotA.filter((img) => img.isModelNameVisible);
    const replacements = pickWeighted(
      excluding(croppedPool.filter((img) => !img.isModelNameVisible), slotA),
      excess
    );
    for (let i = 0; i < Math.min(excess, withModel.length, replacements.length); i++) {
      const idx = slotA.indexOf(withModel[i]);
      if (idx !== -1) {
        slotARejected.push(withModel[i]);
        slotA.splice(idx, 1, replacements[i]);
      }
    }
  }
  selected.push(...slotA);

  // Slot B: 2× difficult images (low correctRatio or hardcoreEligible)
  const slotBPool = hardcorePool.filter(
    (img) => img.correctRatio < 0.4 || img.isHardcoreEligible
  );
  selected.push(...pickWeighted(excl(slotBPool), 2));

  // Slot C: 1× rare or ultra-rare vehicle
  const slotCPool = hardcorePool.filter(
    (img) => img.vehicle.rarity === "rare" || img.vehicle.rarity === "ultra_rare"
  );
  selected.push(...pickWeighted(excl(slotCPool), 1));

  // Slot D: 2× hardcore-eligible
  const slotDPool = hardcorePool.filter((img) => img.isHardcoreEligible);
  selected.push(...pickWeighted(excl(slotDPool), 2));

  // Slot E: 1× weighted filler
  selected.push(...pickWeighted(excl(hardcorePool), 1));

  return shuffle(selected) as SelectedImage[];
}

// ---------------------------------------------------------------------------
// DB query helpers (used by selectTieredImages only)
// ---------------------------------------------------------------------------

// Flat row shape returned by the raw JOIN query
type FlatRow = {
  id: string;
  filename: string;
  vehicleId: string;
  isCropped: boolean;
  isLogoVisible: boolean;
  isModelNameVisible: boolean;
  isHardcoreEligible: boolean;
  vId: string;
  make: string;
  model: string;
  year: number;
  era: string;
  rarity: string;
  statsImageId: string | null;
  totalServes: number | null;
  correctRatio: number | null;
  thumbsUp: number | null;
};

function reshapeRow(row: FlatRow): RawImage {
  return {
    id: row.id,
    filename: row.filename,
    vehicleId: row.vehicleId,
    isCropped: row.isCropped,
    isLogoVisible: row.isLogoVisible,
    isModelNameVisible: row.isModelNameVisible,
    isHardcoreEligible: row.isHardcoreEligible,
    vehicle: {
      id: row.vId,
      make: row.make,
      model: row.model,
      year: Number(row.year),
      era: row.era,
      rarity: row.rarity,
    },
    stats:
      row.statsImageId != null
        ? {
            totalServes: Number(row.totalServes ?? 0),
            correctRatio: Number(row.correctRatio ?? 1.0),
            thumbsUp: Number(row.thumbsUp ?? 0),
          }
        : null,
  };
}

const SELECT_COLUMNS = Prisma.sql`
  i.id,
  i.filename,
  i."vehicleId",
  i."isCropped",
  i."isLogoVisible",
  i."isModelNameVisible",
  i."isHardcoreEligible",
  v.id AS "vId",
  v.make,
  v.model,
  v.year,
  v.era,
  v.rarity,
  s."imageId" AS "statsImageId",
  s."totalServes",
  s."correctRatio",
  s."thumbsUp"
`;

const FROM_JOIN = Prisma.sql`
  FROM "Image" i
  JOIN "Vehicle" v ON v.id = i."vehicleId"
  LEFT JOIN "ImageStats" s ON s."imageId" = i.id
`;

async function fetchLeastServed(
  vehicleIds: string[] | null,
  limit: number
): Promise<RawImage[]> {
  const vehicleFilter =
    vehicleIds != null
      ? Prisma.sql`AND i."vehicleId" = ANY(ARRAY[${Prisma.join(vehicleIds)}]::text[])`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<FlatRow[]>`
    SELECT ${SELECT_COLUMNS}
    ${FROM_JOIN}
    WHERE i."isActive" = true ${vehicleFilter}
    ORDER BY s."totalServes" ASC NULLS FIRST
    LIMIT ${limit}
  `;
  return rows.map(reshapeRow);
}

async function fetchRandom(
  vehicleIds: string[] | null,
  excludeIds: string[],
  limit: number
): Promise<RawImage[]> {
  const vehicleFilter =
    vehicleIds != null
      ? Prisma.sql`AND i."vehicleId" = ANY(ARRAY[${Prisma.join(vehicleIds)}]::text[])`
      : Prisma.empty;
  const excludeFilter =
    excludeIds.length > 0
      ? Prisma.sql`AND NOT (i.id = ANY(ARRAY[${Prisma.join(excludeIds)}]::text[]))`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<FlatRow[]>`
    SELECT ${SELECT_COLUMNS}
    ${FROM_JOIN}
    WHERE i."isActive" = true ${excludeFilter} ${vehicleFilter}
    ORDER BY RANDOM()
    LIMIT ${limit}
  `;
  return rows.map(reshapeRow);
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

export async function selectTieredImages(
  mode: GameMode.Easy | GameMode.Standard | GameMode.Hardcore,
  vehicleFilters: Prisma.VehicleWhereInput[]
): Promise<SelectedImage[]> {
  // Pre-fetch vehicle IDs when filters are present so the raw queries can filter by them
  let vehicleIds: string[] | null = null;
  if (vehicleFilters.length > 0) {
    const vehicles = await prisma.vehicle.findMany({
      where: { AND: vehicleFilters },
      select: { id: true },
    });
    vehicleIds = vehicles.map((v) => v.id);
    if (vehicleIds.length === 0) {
      throw new Error("Not enough images match this filter");
    }
  }

  // Greedy Fetch: 50 least-served + 250 random (excluding the 50)
  const leastServed = await fetchLeastServed(vehicleIds, 50);
  const leastServedIds = leastServed.map((img) => img.id);
  const random250 = await fetchRandom(vehicleIds, leastServedIds, 250);
  const freshPool = deriveMetrics([...leastServed, ...random250]);

  const tierFn =
    mode === GameMode.Easy
      ? selectRookieImages
      : mode === GameMode.Standard
        ? selectStandardImages
        : selectHardcoreImages;

  let result = tierFn(freshPool);
  if (result.length === 10) return result;

  // Lazy fallback: expand the pool with any remaining active images
  const selectedIds = result.map((img) => img.id);
  const fallbackRaw = await fetchRandom(vehicleIds, selectedIds, 500);
  const expandedPool = [...freshPool, ...deriveMetrics(fallbackRaw)];
  result = tierFn(expandedPool);

  if (result.length < 10) {
    throw new Error("Not enough images match this filter");
  }

  return result;
}
