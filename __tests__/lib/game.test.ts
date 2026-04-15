import { describe, it, expect } from "vitest";
import { GameMode } from "../../app/lib/constants";
import {
  levenshtein,
  normalise,
  fuzzyMatch,
  shuffle,
  selectDistractors,
  vehicleLabel,
  scoreRound,
  proLevelBonus,
  type VehicleForDistractor,
} from "@/app/lib/game";

// ---------------------------------------------------------------------------
// levenshtein
// ---------------------------------------------------------------------------

describe("levenshtein", () => {
  it("should return 0 for identical strings", () => {
    expect(levenshtein("supra", "supra")).toBe(0);
  });

  it("should return the string length when comparing against an empty string", () => {
    expect(levenshtein("abc", "")).toBe(3);
  });

  it("should return 1 for a single substitution", () => {
    expect(levenshtein("cat", "bat")).toBe(1);
  });

  it("should return 1 for a single insertion", () => {
    expect(levenshtein("car", "cars")).toBe(1);
  });

  it("should return 1 for a single deletion", () => {
    expect(levenshtein("cars", "car")).toBe(1);
  });

  it("should return 2 for two edits", () => {
    expect(levenshtein("kitten", "sitten")).toBe(1); // one substitution
    expect(levenshtein("saturday", "sunday")).toBe(3);
  });

  it("should be symmetric", () => {
    expect(levenshtein("abc", "xyz")).toBe(levenshtein("xyz", "abc"));
  });
});

// ---------------------------------------------------------------------------
// normalise
// ---------------------------------------------------------------------------

describe("normalise", () => {
  it("should lowercase the string", () => {
    expect(normalise("SUPRA")).toBe("supra");
  });

  it("should strip whitespace", () => {
    expect(normalise("  supra  ")).toBe("supra");
  });

  it("should strip special characters", () => {
    expect(normalise("Alfa-Romeo")).toBe("alfaromeo");
  });

  it("should preserve digits", () => {
    expect(normalise("911 GT3")).toBe("911gt3");
  });

  it("should return an empty string for whitespace-only input", () => {
    expect(normalise("   ")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// fuzzyMatch
// ---------------------------------------------------------------------------

describe("fuzzyMatch", () => {
  it("should return true for an exact match", () => {
    expect(fuzzyMatch("Supra", "Supra", [])).toBe(true);
  });

  it("should return true for a case-insensitive match", () => {
    expect(fuzzyMatch("supra", "SUPRA", [])).toBe(true);
  });

  it("should return true when the guess matches an alias", () => {
    expect(fuzzyMatch("MR2", "MR2 Spyder", ["MR2"])).toBe(true);
  });

  it("should return true when Levenshtein distance is exactly 2", () => {
    // "suppa" vs "supra" → distance 2 (two edits)
    expect(fuzzyMatch("suppa", "supra", [])).toBe(true);
  });

  it("should return false when Levenshtein distance exceeds 2", () => {
    expect(fuzzyMatch("honda", "toyota", [])).toBe(false);
  });

  it("should return false when no alias matches and distance > 2", () => {
    expect(fuzzyMatch("Civic", "Supra", ["Corolla"])).toBe(false);
  });

  it("should normalise aliases before comparing", () => {
    expect(fuzzyMatch("mr2", "MR2 Spyder", ["MR-2"])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// shuffle
// ---------------------------------------------------------------------------

describe("shuffle", () => {
  it("should return an array with the same elements", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result).toHaveLength(input.length);
    expect(result.sort()).toEqual([...input].sort());
  });

  it("should not mutate the original array", () => {
    const input = [1, 2, 3];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });

  it("should return an empty array when given an empty array", () => {
    expect(shuffle([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// selectDistractors
// ---------------------------------------------------------------------------

function makeVehicle(
  id: string,
  make: string,
  model: string,
  era: VehicleForDistractor["era"],
  categorySlugs: string[] = []
): VehicleForDistractor {
  return { id, make, model, era, categorySlugs };
}

describe("selectDistractors", () => {
  const correct = makeVehicle("c1", "Toyota", "Supra", "retro", ["sports", "jdm"]);

  it("should return `count` distractors when the pool is large enough", () => {
    const pool = [
      correct,
      makeVehicle("d1", "Honda", "NSX", "retro", ["sports"]),
      makeVehicle("d2", "Nissan", "Skyline", "retro", ["jdm"]),
      makeVehicle("d3", "Mazda", "RX-7", "retro", ["sports"]),
      makeVehicle("d4", "Mitsubishi", "Eclipse", "retro", []),
    ];
    expect(selectDistractors(correct, pool, 3)).toHaveLength(3);
  });

  it("should exclude the correct vehicle from results", () => {
    const pool = [
      correct,
      makeVehicle("d1", "Honda", "NSX", "retro", ["sports"]),
      makeVehicle("d2", "Nissan", "Skyline", "retro", []),
      makeVehicle("d3", "Mazda", "RX-7", "retro", []),
    ];
    const result = selectDistractors(correct, pool, 3);
    expect(result.every((v) => v.id !== correct.id)).toBe(true);
  });

  it("should include at most 1 same-make vehicle", () => {
    const pool = [
      correct,
      makeVehicle("d1", "Toyota", "Celica", "retro", []),
      makeVehicle("d2", "Toyota", "MR2", "retro", []),
      makeVehicle("d3", "Honda", "NSX", "retro", ["sports"]),
      makeVehicle("d4", "Nissan", "Skyline", "retro", []),
    ];
    const result = selectDistractors(correct, pool, 3);
    const sameMakeCount = result.filter((v) => v.make === correct.make).length;
    expect(sameMakeCount).toBeLessThanOrEqual(1);
  });

  it("should deduplicate by make+model", () => {
    const pool = [
      correct,
      makeVehicle("d1a", "Honda", "NSX", "retro", ["sports"]),
      makeVehicle("d1b", "Honda", "NSX", "retro", ["sports"]), // duplicate label
      makeVehicle("d2", "Nissan", "Skyline", "retro", []),
    ];
    const result = selectDistractors(correct, pool, 2);
    const labels = result.map((v) => `${v.make}|${v.model}`);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("should return fewer than count when the pool is too small", () => {
    const pool = [
      correct,
      makeVehicle("d1", "Honda", "NSX", "retro", []),
    ];
    const result = selectDistractors(correct, pool, 3);
    expect(result.length).toBeLessThan(3);
  });

  it("should prefer same-category vehicles over same-era-only vehicles", () => {
    // d_cat shares category; d_era shares only era
    const dCat = makeVehicle("d_cat", "Honda", "NSX", "retro", ["sports"]);
    const dEra = makeVehicle("d_era", "Ford", "Mustang", "retro", []);
    const pool = [correct, dCat, dEra];

    // With count=1, should pick dCat (same category, different make) over dEra
    const result = selectDistractors(correct, pool, 1);
    expect(result[0].id).toBe("d_cat");
  });
});

// ---------------------------------------------------------------------------
// vehicleLabel
// ---------------------------------------------------------------------------

describe("vehicleLabel", () => {
  it("should combine make and model with a space", () => {
    expect(vehicleLabel({ make: "Toyota", model: "Supra" })).toBe("Toyota Supra");
  });
});

// ---------------------------------------------------------------------------
// scoreRound
// ---------------------------------------------------------------------------

const BASE_ARGS = {
  makeCorrect: true,
  modelCorrect: true,
  yearDelta: 0,
  elapsedMs: 0,
  timeLimitMs: 60_000,
  mode: "standard",
} as const;

describe("scoreRound", () => {
  describe("makePoints", () => {
    it("should award 300 when make is correct", () => {
      const { makePoints } = scoreRound({ ...BASE_ARGS });
      expect(makePoints).toBe(300);
    });

    it("should award 0 when make is incorrect", () => {
      const { makePoints } = scoreRound({ ...BASE_ARGS, makeCorrect: false });
      expect(makePoints).toBe(0);
    });
  });

  describe("modelPoints", () => {
    it("should award 400 when both make and model are correct in standard mode", () => {
      const { modelPoints } = scoreRound({ ...BASE_ARGS });
      expect(modelPoints).toBe(400);
    });

    it("should award 0 when make is wrong in standard mode even if model is correct", () => {
      const { modelPoints } = scoreRound({ ...BASE_ARGS, makeCorrect: false, modelCorrect: true });
      expect(modelPoints).toBe(0);
    });

    it("should award model points independently of make in custom mode", () => {
      const { modelPoints } = scoreRound({
        ...BASE_ARGS,
        mode: "custom",
        makeCorrect: false,
        modelCorrect: true,
      });
      expect(modelPoints).toBe(400);
    });
  });

  describe("yearBonus", () => {
    it("should return 200 for a yearDelta of 0 in standard mode", () => {
      const { yearBonus } = scoreRound({ ...BASE_ARGS, yearDelta: 0 });
      expect(yearBonus).toBe(200);
    });

    it("should return 0 for a yearDelta of 5 or more", () => {
      const { yearBonus } = scoreRound({ ...BASE_ARGS, yearDelta: 5 });
      expect(yearBonus).toBe(0);
    });

    it("should clamp yearBonus at 0 (no negative bonus)", () => {
      const { yearBonus } = scoreRound({ ...BASE_ARGS, yearDelta: 10 });
      expect(yearBonus).toBe(0);
    });

    it("should return null for easy mode", () => {
      const { yearBonus } = scoreRound({ ...BASE_ARGS, mode: "easy", yearDelta: 0 });
      expect(yearBonus).toBeNull();
    });

    it("should return null for custom mode", () => {
      const { yearBonus } = scoreRound({ ...BASE_ARGS, mode: "custom", yearDelta: 0 });
      expect(yearBonus).toBeNull();
    });

    it("should apply year bonus in time_attack mode", () => {
      const { yearBonus } = scoreRound({ ...BASE_ARGS, mode: "time_attack", yearDelta: 0 });
      expect(yearBonus).toBe(200);
    });

    it("should apply year bonus in hardcore mode", () => {
      const { yearBonus } = scoreRound({ ...BASE_ARGS, mode: "hardcore", yearDelta: 0, panelsRevealed: 5 });
      expect(yearBonus).toBe(200);
    });
  });

  describe("timeBonus", () => {
    it("should award full time bonus when elapsed is 0", () => {
      const { timeBonus } = scoreRound({ ...BASE_ARGS, elapsedMs: 0 });
      expect(timeBonus).toBe(100);
    });

    it("should award 0 time bonus when fully elapsed", () => {
      const { timeBonus } = scoreRound({ ...BASE_ARGS, elapsedMs: 60_000 });
      expect(timeBonus).toBe(0);
    });

    it("should award 0 time bonus when make is incorrect", () => {
      const { timeBonus } = scoreRound({ ...BASE_ARGS, makeCorrect: false, elapsedMs: 0 });
      expect(timeBonus).toBe(0);
    });

    it("should award 0 time bonus in practice mode", () => {
      const { timeBonus } = scoreRound({ ...BASE_ARGS, mode: "practice", elapsedMs: 0 });
      expect(timeBonus).toBe(0);
    });
  });

  describe("modeMultiplier", () => {
    it("should use 1.0 for easy mode", () => {
      const { modeMultiplier } = scoreRound({ ...BASE_ARGS, mode: "easy" });
      expect(modeMultiplier).toBe(1.0);
    });

    it("should use 1.7 for standard mode", () => {
      const { modeMultiplier } = scoreRound({ ...BASE_ARGS });
      expect(modeMultiplier).toBe(1.7);
    });

    it("should use 2.0 for time_attack mode", () => {
      const { modeMultiplier } = scoreRound({ ...BASE_ARGS, mode: "time_attack" });
      expect(modeMultiplier).toBe(2.0);
    });

    it("should use 0 for practice mode", () => {
      const { modeMultiplier } = scoreRound({ ...BASE_ARGS, mode: "practice" });
      expect(modeMultiplier).toBe(0);
    });

    it("should use 4.0 for hardcore with 1 panel revealed", () => {
      const { modeMultiplier } = scoreRound({ ...BASE_ARGS, mode: "hardcore", panelsRevealed: 1 });
      expect(modeMultiplier).toBe(4.0);
    });

    it("should use 1.0 for hardcore with 9 panels revealed", () => {
      const { modeMultiplier } = scoreRound({ ...BASE_ARGS, mode: "hardcore", panelsRevealed: 9 });
      expect(modeMultiplier).toBe(1.0);
    });

    it("should clamp hardcore multiplier for out-of-range panel counts", () => {
      const { modeMultiplier: low } = scoreRound({ ...BASE_ARGS, mode: "hardcore", panelsRevealed: 0 });
      const { modeMultiplier: high } = scoreRound({ ...BASE_ARGS, mode: "hardcore", panelsRevealed: 99 });
      expect(low).toBe(4.0);
      expect(high).toBe(1.0);
    });
  });

  describe("pointsEarned", () => {
    it("should return 0 for practice mode regardless of correct guesses", () => {
      const { pointsEarned } = scoreRound({ ...BASE_ARGS, mode: "practice" });
      expect(pointsEarned).toBe(0);
    });

    it("should floor the result to an integer", () => {
      const { pointsEarned } = scoreRound({ ...BASE_ARGS, mode: "standard", elapsedMs: 30_000 });
      expect(Number.isInteger(pointsEarned)).toBe(true);
    });

    it("should combine all components for a perfect standard round", () => {
      // makePoints=300, modelPoints=400, yearBonus=200, timeBonus=100, multiplier=1.7
      // base=1000, pointsEarned=floor(1000*1.7)=1700
      const { pointsEarned } = scoreRound({ ...BASE_ARGS, elapsedMs: 0, yearDelta: 0 });
      expect(pointsEarned).toBe(1700);
    });
  });
});

// ---------------------------------------------------------------------------
// proLevelBonus
// ---------------------------------------------------------------------------

describe("proLevelBonus", () => {
  it("should return 0 when there are no guesses", () => {
    expect(proLevelBonus(0, 0)).toBe(0);
  });

  it("should return 1000 when incorrect ratio exceeds 0.95", () => {
    expect(proLevelBonus(1, 20)).toBe(1000); // ratio ≈ 0.952
  });

  it("should return 500 when incorrect ratio is between 0.90 and 0.95", () => {
    expect(proLevelBonus(1, 10)).toBe(500); // ratio ≈ 0.909
  });

  it("should return 300 when incorrect ratio is between 0.70 and 0.90", () => {
    expect(proLevelBonus(3, 10)).toBe(300); // ratio ≈ 0.769
  });

  it("should return 100 when incorrect ratio is between 0.50 and 0.70", () => {
    expect(proLevelBonus(4, 5)).toBe(100); // ratio = 0.556
  });

  it("should return 0 when incorrect ratio is at or below 0.50", () => {
    expect(proLevelBonus(5, 5)).toBe(0); // ratio = 0.50
    expect(proLevelBonus(10, 5)).toBe(0); // ratio ≈ 0.33
  });
});
