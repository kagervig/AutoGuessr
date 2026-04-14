// Shared types for the eligibility report — imported by both the route handler and the client panel.
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
