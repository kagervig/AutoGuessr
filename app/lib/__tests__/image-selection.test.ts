// Tests for the tiered image selection system (image-selection.ts)

import { describe, it, expect } from "vitest";
import {
  deriveMetrics,
  excluding,
  pickWeighted,
  selectRookieImages,
  selectStandardImages,
  selectHardcoreImages,
} from "../image-selection";
import type { RawImage, ScoredImage } from "../image-selection";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeRaw(
  n: number,
  overrides: Partial<Omit<RawImage, "vehicle" | "stats">> & {
    vehicle?: Partial<RawImage["vehicle"]>;
    stats?: RawImage["stats"];
  } = {}
): RawImage {
  const { vehicle: vOverrides, stats, ...imgOverrides } = overrides;
  return {
    id: `img-${n}`,
    filename: `img${n}.jpg`,
    vehicleId: `veh-${n}`,
    isCropped: false,
    isLogoVisible: false,
    isModelNameVisible: false,
    isHardcoreEligible: false,
    stats: stats !== undefined ? stats : null,
    ...imgOverrides,
    vehicle: {
      id: `veh-${n}`,
      make: `Make${n}`,
      model: `Model${n}`,
      year: 2000,
      era: "modern",
      rarity: "common",
      ...(vOverrides ?? {}),
    },
  };
}

function makeScored(
  n: number,
  overrides: Partial<Omit<ScoredImage, "vehicle">> & {
    vehicle?: Partial<ScoredImage["vehicle"]>;
  } = {}
): ScoredImage {
  const { vehicle: vOverrides, ...imgOverrides } = overrides;
  return {
    id: `img-${n}`,
    filename: `img${n}.jpg`,
    vehicleId: `veh-${n}`,
    isCropped: false,
    isLogoVisible: false,
    isModelNameVisible: false,
    isHardcoreEligible: false,
    stats: null,
    totalServes: 0,
    correctRatio: 1.0,
    selectionWeight: 1.0,
    ...imgOverrides,
    vehicle: {
      id: `veh-${n}`,
      make: `Make${n}`,
      model: `Model${n}`,
      year: 2000,
      era: "modern",
      rarity: "common",
      ...(vOverrides ?? {}),
    },
  };
}

// ---------------------------------------------------------------------------
// deriveMetrics
// ---------------------------------------------------------------------------

describe("deriveMetrics", () => {
  it("should assign default metrics to an image with no stats row", () => {
    const [result] = deriveMetrics([makeRaw(1, { stats: null })]);
    expect(result.totalServes).toBe(0);
    expect(result.correctRatio).toBe(1.0);
    expect(result.selectionWeight).toBe(1.0);
  });

  it("should read totalServes and correctRatio directly from stored stats columns", () => {
    const [result] = deriveMetrics([
      makeRaw(1, {
        stats: { totalServes: 12, correctRatio: 0.6, thumbsUp: 0 },
      }),
    ]);
    expect(result.totalServes).toBe(12);
    expect(result.correctRatio).toBe(0.6);
  });

  it("should assign selectionWeight 1.5 when thumbsUp is positive", () => {
    const [result] = deriveMetrics([
      makeRaw(1, { stats: { totalServes: 5, correctRatio: 0.8, thumbsUp: 3 } }),
    ]);
    expect(result.selectionWeight).toBe(1.5);
  });

  it("should assign selectionWeight 1.0 when thumbsUp is zero", () => {
    const [result] = deriveMetrics([
      makeRaw(1, { stats: { totalServes: 5, correctRatio: 0.8, thumbsUp: 0 } }),
    ]);
    expect(result.selectionWeight).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// excluding
// ---------------------------------------------------------------------------

describe("excluding", () => {
  it("should remove images whose make+model matches any selected image", () => {
    const pool = [makeScored(1), makeScored(2), makeScored(3)];
    const selected = [makeScored(2)];
    const result = excluding(pool, selected);
    expect(result.map((i) => i.id)).toEqual(["img-1", "img-3"]);
  });

  it("should exclude all images sharing a make+model when any is selected", () => {
    const pool = [
      makeScored(1, { vehicle: { make: "Toyota", model: "Supra" } }),
      makeScored(2, { vehicle: { make: "Toyota", model: "Supra" } }), // same make+model, different image
      makeScored(3, { vehicle: { make: "Ford", model: "Mustang" } }),
    ];
    const selected = [makeScored(99, { vehicle: { make: "Toyota", model: "Supra" } })];
    const result = excluding(pool, selected);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("img-3");
  });

  it("should return the full pool when selected is empty", () => {
    const pool = [makeScored(1), makeScored(2)];
    expect(excluding(pool, [])).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// pickWeighted
// ---------------------------------------------------------------------------

describe("pickWeighted", () => {
  it("should return exactly n items", () => {
    const pool = [makeScored(1), makeScored(2), makeScored(3), makeScored(4)];
    expect(pickWeighted(pool, 3)).toHaveLength(3);
  });

  it("should return all items when n exceeds pool size", () => {
    const pool = [makeScored(1), makeScored(2)];
    expect(pickWeighted(pool, 5)).toHaveLength(2);
  });

  it("should return distinct items (no duplicates)", () => {
    const pool = Array.from({ length: 5 }, (_, i) => makeScored(i + 1));
    const result = pickWeighted(pool, 5);
    const ids = result.map((img) => img.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should select higher-weight items at a proportionally higher rate over many trials", () => {
    // One image with weight 4.0, one with weight 1.0; expect ~4× more picks for the heavier one.
    const heavy = makeScored(1, { selectionWeight: 4.0 });
    const light = makeScored(2, { selectionWeight: 1.0 });
    const TRIALS = 2000;
    let heavyCount = 0;
    for (let i = 0; i < TRIALS; i++) {
      const [pick] = pickWeighted([heavy, light], 1);
      if (pick.id === "img-1") heavyCount++;
    }
    const heavyRate = heavyCount / TRIALS;
    // Expected rate ≈ 0.80 (4/5); allow ±0.10 tolerance
    expect(heavyRate).toBeGreaterThan(0.70);
    expect(heavyRate).toBeLessThan(0.90);
  });
});

// ---------------------------------------------------------------------------
// selectRookieImages
// ---------------------------------------------------------------------------

describe("selectRookieImages", () => {
  function makeRookiePool(): ScoredImage[] {
    // Slot A candidates: 6× logo-visible, non-cropped, common, in rookieBase
    const slotA = Array.from({ length: 6 }, (_, i) =>
      makeScored(i + 1, { isLogoVisible: true })
    );
    // Slot B candidates: 2× rare, non-logo-visible, non-cropped, in rookieBase
    const slotB = Array.from({ length: 2 }, (_, i) =>
      makeScored(i + 10, { vehicle: { id: `veh-${i + 10}`, make: `Make${i + 10}`, model: `Model${i + 10}`, year: 2000, era: "modern", rarity: "rare" } })
    );
    // Slot C candidates: 2× cropped, in rookieBase
    const slotC = Array.from({ length: 2 }, (_, i) =>
      makeScored(i + 20, { isCropped: true })
    );
    // Slot D candidates: 5× plain filler
    const slotD = Array.from({ length: 5 }, (_, i) => makeScored(i + 30));
    return [...slotA, ...slotB, ...slotC, ...slotD];
  }

  it("should return 10 images from an adequate pool", () => {
    expect(selectRookieImages(makeRookiePool())).toHaveLength(10);
  });

  it("should not mark any image with pointsBonus (slot C is disabled)", () => {
    const result = selectRookieImages(makeRookiePool());
    const bonusImages = result.filter((img) => img.pointsBonus === true);
    expect(bonusImages).toHaveLength(0);
  });

  it("should include at least 40% make/model-visible images", () => {
    const result = selectRookieImages(makeRookiePool());
    const makeModelCount = result.filter(
      (img) => img.isLogoVisible || img.isModelNameVisible
    ).length;
    expect(makeModelCount / result.length).toBeGreaterThanOrEqual(0.4);
  });

  it("should not include the same make+model pair twice", () => {
    const result = selectRookieImages(makeRookiePool());
    const pairs = result.map((img) => `${img.vehicle.make}|${img.vehicle.model}`);
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it("should return fewer than 10 images without throwing when pool is too small", () => {
    const tinyPool = [
      makeScored(1, { isLogoVisible: true }),
      makeScored(2, { isCropped: true }),
    ];
    expect(() => selectRookieImages(tinyPool)).not.toThrow();
    expect(selectRookieImages(tinyPool).length).toBeLessThanOrEqual(10);
  });

  it("should fall back to pool images to reach 10 when slot criteria cannot be filled", () => {
    // 15 plain images: none logo-visible, none rare, none cropped — slots A/B/C yield 0, slot D yields 3
    const plainPool = Array.from({ length: 15 }, (_, i) => makeScored(i + 100));
    expect(selectRookieImages(plainPool)).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// selectStandardImages
// ---------------------------------------------------------------------------

describe("selectStandardImages", () => {
  function makeStandardPool(): ScoredImage[] {
    // Need distinct candidates for each slot so all 10 images are filled
    return [
      makeScored(1, { isHardcoreEligible: true }),         // A
      makeScored(2, { isCropped: true }),                  // B
      makeScored(3, { isCropped: true }),                  // B
      makeScored(4, { vehicle: { id: "veh-4", make: "Make4", model: "Model4", year: 2000, era: "modern", rarity: "rare" } }), // C
      makeScored(5, { isLogoVisible: true }),               // D
      makeScored(6, { isLogoVisible: true }),               // D
      makeScored(7, { isModelNameVisible: true }),          // D
      ...Array.from({ length: 7 }, (_, i) => makeScored(i + 10)), // E filler
    ];
  }

  it("should return 10 images from an adequate pool", () => {
    expect(selectStandardImages(makeStandardPool())).toHaveLength(10);
  });

  it("should include at least 30% make/model-visible images", () => {
    const result = selectStandardImages(makeStandardPool());
    const makeModelCount = result.filter(
      (img) => img.isLogoVisible || img.isModelNameVisible
    ).length;
    expect(makeModelCount / result.length).toBeGreaterThanOrEqual(0.3);
  });

  it("should not include the same make+model pair twice", () => {
    const result = selectStandardImages(makeStandardPool());
    const pairs = result.map((img) => `${img.vehicle.make}|${img.vehicle.model}`);
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it("should return fewer than 10 images without throwing when pool is too small", () => {
    const tinyPool = [makeScored(1), makeScored(2)];
    expect(() => selectStandardImages(tinyPool)).not.toThrow();
    expect(selectStandardImages(tinyPool).length).toBeLessThanOrEqual(10);
  });

  it("should fall back to pool images to reach 10 when slot criteria cannot be filled", () => {
    // 15 plain images: none hardcore-eligible, none cropped, none rare, none logo-visible — slots A–D yield 0, slot E yields 3
    const plainPool = Array.from({ length: 15 }, (_, i) => makeScored(i + 100));
    expect(selectStandardImages(plainPool)).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// selectHardcoreImages
// ---------------------------------------------------------------------------

describe("selectHardcoreImages", () => {
  function makeHardcorePool(): ScoredImage[] {
    // Slot A: 6× cropped images; 3 with isModelNameVisible, 3 without
    const slotACroppedWithModel = Array.from({ length: 3 }, (_, i) =>
      makeScored(i + 1, { isCropped: true, isModelNameVisible: true })
    );
    const slotACroppedNoModel = Array.from({ length: 3 }, (_, i) =>
      makeScored(i + 10, { isCropped: true })
    );
    // Slot B only: 4× with low correctRatio but NOT hardcoreEligible — do not overlap with slot D
    const slotBOnly = Array.from({ length: 4 }, (_, i) =>
      makeScored(i + 20, { correctRatio: 0.2, totalServes: 10 })
    );
    // Slot C: 2× rare vehicles
    const slotC = Array.from({ length: 2 }, (_, i) =>
      makeScored(i + 30, { vehicle: { id: `veh-${i + 30}`, make: `Make${i + 30}`, model: `Model${i + 30}`, year: 2000, era: "modern", rarity: "rare" } })
    );
    // Slot D: 6× hardcoreEligible. These also qualify for slot B (isHardcoreEligible satisfies the
    // slot B filter), so we need at least 4 (2 for slot B worst case + 2 needed for slot D).
    const slotDOnly = Array.from({ length: 6 }, (_, i) =>
      makeScored(i + 40, { isHardcoreEligible: true })
    );
    // Slot E filler
    const slotE = Array.from({ length: 3 }, (_, i) => makeScored(i + 50));
    return [
      ...slotACroppedWithModel,
      ...slotACroppedNoModel,
      ...slotBOnly,
      ...slotC,
      ...slotDOnly,
      ...slotE,
    ];
  }

  it("should return 10 images from an adequate pool", () => {
    expect(selectHardcoreImages(makeHardcorePool())).toHaveLength(10);
  });

  it("should include at most 2 cropped images with isModelNameVisible", () => {
    const result = selectHardcoreImages(makeHardcorePool());
    const croppedWithModel = result.filter(
      (img) => img.isCropped && img.isModelNameVisible
    );
    expect(croppedWithModel.length).toBeLessThanOrEqual(2);
  });

  it("should not include the same make+model pair twice", () => {
    const result = selectHardcoreImages(makeHardcorePool());
    const pairs = result.map((img) => `${img.vehicle.make}|${img.vehicle.model}`);
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it("should return fewer than 10 images without throwing when pool is too small", () => {
    const tinyPool = [makeScored(1, { isCropped: true }), makeScored(2)];
    expect(() => selectHardcoreImages(tinyPool)).not.toThrow();
    expect(selectHardcoreImages(tinyPool).length).toBeLessThanOrEqual(10);
  });

  it("should fall back to pool images to reach 10 when slot criteria cannot be filled", () => {
    // 15 plain images: none cropped, none hardcoreEligible, none rare, correctRatio default 1.0
    // All pass hardcorePool (totalServes === 0); slot A–D yield 0, slot E yields 1
    const plainPool = Array.from({ length: 15 }, (_, i) => makeScored(i + 100));
    expect(selectHardcoreImages(plainPool)).toHaveLength(10);
  });
});
