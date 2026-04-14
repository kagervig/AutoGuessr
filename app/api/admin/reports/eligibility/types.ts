// Shared types and pure builder for the eligibility report.
// Imported by both the route handler and the client panel (and tests).

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

export interface SlotCount {
  slot: string;
  count: bigint | number;
}

export function buildReport(rows: SlotCount[], totalActiveImages: number): EligibilityReport {
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
