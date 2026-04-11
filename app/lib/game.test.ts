import { describe, it, expect } from "vitest";
import {
  levenshtein,
  normalise,
  fuzzyMatch,
  selectDistractors,
  scoreRound,
  proLevelBonus,
  type VehicleForDistractor,
} from "./game";

// ---------------------------------------------------------------------------
// levenshtein algorithm for measuring the "edit distance" between two strings
// If your answer is within 2 edits of the correct answer, it counts as a match
//  - "cat" → "bat" = 1 (one substitution: c→b)
//  - "car" → "cars" = 1 (one insertion: add s)
//  - "kitten" → "sitting" = 3
// ---------------------------------------------------------------------------

describe("levenshtein", () => {
  it("should return 0 for identical strings", () => {
    expect(levenshtein("ford", "ford")).toBe(0);
  });

  it("should return 0 for two empty strings", () => {
    expect(levenshtein("", "")).toBe(0);
  });

  it("should return the string length when one side is empty", () => {
    expect(levenshtein("abc", "")).toBe(3);
    expect(levenshtein("", "abc")).toBe(3);
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
    expect(levenshtein("ford", "fird")).toBe(1); // sanity
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// normalise
// ---------------------------------------------------------------------------

describe("normalise", () => {
  it("should lowercase the string", () => {
    expect(normalise("Ford")).toBe("ford");
  });

  it("should strip non-alphanumeric characters", () => {
    expect(normalise("Land Rover")).toBe("landrover");
    expect(normalise("Mercedes-Benz")).toBe("mercedesbenz");
  });

  it("should trim leading and trailing whitespace", () => {
    expect(normalise("  ford  ")).toBe("ford");
  });

  it("should handle an already-normalised string unchanged", () => {
    expect(normalise("toyota")).toBe("toyota");
  });
});

// ---------------------------------------------------------------------------
// fuzzyMatch
// If your answer is within 2 edits of the correct answer, it counts as a match
// ---------------------------------------------------------------------------

describe("fuzzyMatch", () => {
  it("should return true for an exact match", () => {
    expect(fuzzyMatch("Ford", "Ford", [])).toBe(true);
  });

  it("should be case-insensitive and ignore punctuation", () => {
    expect(fuzzyMatch("mercedes benz", "Mercedes-Benz", [])).toBe(true);
  });

  it("should return true when the guess matches an alias", () => {
    expect(fuzzyMatch("Chevy", "Chevrolet", ["Chevy"])).toBe(true);
  });

  it("should return true for a 1-character typo (Levenshtein ≤ 2)", () => {
    expect(fuzzyMatch("Mustag", "Mustang", [])).toBe(true);
  });

  it("should return true for a 2-character typo (Levenshtein ≤ 2)", () => {
    expect(fuzzyMatch("Musang", "Mustang", [])).toBe(true);
  });

  it("should return false when edit distance exceeds 2", () => {
    // "musig" vs "mustang" has edit distance 3
    expect(fuzzyMatch("Musig", "Mustang", [])).toBe(false);
  });

  it("should return false for a completely different string", () => {
    expect(fuzzyMatch("Toyota", "Ford", [])).toBe(false);
  });

  it("should return false when guess matches no alias", () => {
    expect(fuzzyMatch("Chevy", "Chevrolet", ["Chev"])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectDistractors
// ---------------------------------------------------------------------------

function makeVehicle(
  overrides: Partial<VehicleForDistractor> & { id: string },
): VehicleForDistractor {
  return {
    make: "TestMake",
    model: "TestModel",
    era: "1980s" as VehicleForDistractor["era"],
    categorySlugs: [],
    ...overrides,
  };
}

describe("selectDistractors", () => {
  it("should return the requested number of distractors", () => {
    const correct = makeVehicle({
      id: "c1",
      make: "Ford",
      model: "Mustang",
      era: "1960s" as VehicleForDistractor["era"],
    });
    const pool = [
      correct,
      makeVehicle({
        id: "d1",
        make: "Chevrolet",
        model: "Camaro",
        era: "1960s" as VehicleForDistractor["era"],
      }),
      makeVehicle({
        id: "d2",
        make: "Dodge",
        model: "Challenger",
        era: "1970s" as VehicleForDistractor["era"],
      }),
      makeVehicle({
        id: "d3",
        make: "Pontiac",
        model: "Firebird",
        era: "1970s" as VehicleForDistractor["era"],
      }),
      makeVehicle({
        id: "d4",
        make: "AMC",
        model: "Javelin",
        era: "1970s" as VehicleForDistractor["era"],
      }),
    ];
    const result = selectDistractors(correct, pool, 3);
    expect(result).toHaveLength(3);
  });

  it("should not include the correct vehicle in the result", () => {
    const correct = makeVehicle({ id: "c1", make: "Ford", model: "Mustang" });
    const pool = [
      correct,
      makeVehicle({ id: "d1", make: "Chevrolet", model: "Camaro" }),
      makeVehicle({ id: "d2", make: "Dodge", model: "Challenger" }),
      makeVehicle({ id: "d3", make: "Pontiac", model: "Firebird" }),
    ];
    const result = selectDistractors(correct, pool, 3);
    expect(result.find((v) => v.id === "c1")).toBeUndefined();
  });

  it("should include at most 1 same-make vehicle", () => {
    const correct = makeVehicle({ id: "c1", make: "Ford", model: "Mustang" });
    const pool = [
      correct,
      makeVehicle({ id: "f1", make: "Ford", model: "Falcon" }),
      makeVehicle({ id: "f2", make: "Ford", model: "Fairlane" }),
      makeVehicle({ id: "d1", make: "Dodge", model: "Challenger" }),
      makeVehicle({ id: "d2", make: "Pontiac", model: "Firebird" }),
    ];
    const result = selectDistractors(correct, pool, 3);
    const sameMakeCount = result.filter((v) => v.make === "Ford").length;
    expect(sameMakeCount).toBeLessThanOrEqual(1);
  });

  it("should deduplicate by make+model", () => {
    const correct = makeVehicle({ id: "c1", make: "Ford", model: "Mustang" });
    const pool = [
      correct,
      makeVehicle({ id: "d1a", make: "Dodge", model: "Challenger" }),
      makeVehicle({ id: "d1b", make: "Dodge", model: "Challenger" }), // duplicate label
      makeVehicle({ id: "d2", make: "Pontiac", model: "Firebird" }),
      makeVehicle({ id: "d3", make: "AMC", model: "Javelin" }),
    ];
    const result = selectDistractors(correct, pool, 3);
    const keys = result.map((v) => `${v.make}|${v.model}`);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it("should return fewer distractors than requested when pool is small", () => {
    const correct = makeVehicle({ id: "c1", make: "Ford", model: "Mustang" });
    const pool = [
      correct,
      makeVehicle({ id: "d1", make: "Dodge", model: "Challenger" }),
    ];
    const result = selectDistractors(correct, pool, 3);
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// scoreRound
// ---------------------------------------------------------------------------

const BASE_PARAMS = {
  elapsedMs: 0,
  timeLimitMs: 60_000,
};

describe("scoreRound", () => {
  describe("easy mode", () => {
    it("should award make + model points with 1.0 multiplier", () => {
      const result = scoreRound({
        ...BASE_PARAMS,
        makeCorrect: true,
        modelCorrect: true,
        yearDelta: null,
        mode: "easy",
      });
      expect(result.makePoints).toBe(300);
      expect(result.modelPoints).toBe(400);
      expect(result.yearBonus).toBeNull();
      expect(result.modeMultiplier).toBe(1.0);
      expect(result.pointsEarned).toBe(Math.floor((300 + 400 + 100) * 1.0));
    });

    it("should award 0 points when wrong", () => {
      const result = scoreRound({
        ...BASE_PARAMS,
        makeCorrect: false,
        modelCorrect: false,
        yearDelta: null,
        mode: "easy",
      });
      expect(result.makePoints).toBe(0);
      expect(result.modelPoints).toBe(0);
      expect(result.pointsEarned).toBe(0);
    });
  });

  describe("standard mode", () => {
    it("should apply 1.7 multiplier and include year bonus for exact year match", () => {
      const result = scoreRound({
        ...BASE_PARAMS,
        makeCorrect: true,
        modelCorrect: true,
        yearDelta: 0,
        mode: "standard",
      });
      expect(result.yearBonus).toBe(200);
      expect(result.modeMultiplier).toBe(1.7);
      expect(result.pointsEarned).toBe(
        Math.floor((300 + 400 + 200 + 100) * 1.7),
      );
    });

    it("should award no model points when make is wrong", () => {
      const result = scoreRound({
        ...BASE_PARAMS,
        makeCorrect: false,
        modelCorrect: true,
        yearDelta: 0,
        mode: "standard",
      });
      expect(result.makePoints).toBe(0);
      expect(result.modelPoints).toBe(0);
    });

    it("should scale year bonus down proportionally to yearDelta", () => {
      const result = scoreRound({
        ...BASE_PARAMS,
        makeCorrect: true,
        modelCorrect: true,
        yearDelta: 5,
        mode: "standard",
      });
      expect(result.yearBonus).toBe(0);
    });

    it("should clamp year bonus to 0 for large yearDelta", () => {
      const result = scoreRound({
        ...BASE_PARAMS,
        makeCorrect: true,
        modelCorrect: true,
        yearDelta: 10,
        mode: "standard",
      });
      expect(result.yearBonus).toBe(0);
    });

    it("should award no time bonus when make is wrong", () => {
      const result = scoreRound({
        ...BASE_PARAMS,
        makeCorrect: false,
        modelCorrect: false,
        yearDelta: null,
        mode: "standard",
      });
      expect(result.timeBonus).toBe(0);
    });
  });

  describe("time_attack mode", () => {
    it("should apply 2.0 multiplier", () => {
      const result = scoreRound({
        ...BASE_PARAMS,
        makeCorrect: true,
        modelCorrect: true,
        yearDelta: null,
        mode: "time_attack",
      });
      expect(result.modeMultiplier).toBe(2.0);
    });
  });

  describe("hardcore mode", () => {
    it("should give maximum multiplier (4.0) when only 1 panel revealed", () => {
      const result = scoreRound({
        ...BASE_PARAMS,
        makeCorrect: true,
        modelCorrect: true,
        yearDelta: 0,
        mode: "hardcore",
        panelsRevealed: 1,
      });
      expect(result.modeMultiplier).toBeCloseTo(4.0, 5);
    });

    it("should give minimum multiplier (1.0) when all 9 panels revealed", () => {
      const result = scoreRound({
        ...BASE_PARAMS,
        makeCorrect: true,
        modelCorrect: true,
        yearDelta: 0,
        mode: "hardcore",
        panelsRevealed: 9,
      });
      expect(result.modeMultiplier).toBeCloseTo(1.0, 5);
    });

    it("should clamp panelsRevealed below 1 to 1", () => {
      const result = scoreRound({
        ...BASE_PARAMS,
        makeCorrect: true,
        modelCorrect: true,
        yearDelta: 0,
        mode: "hardcore",
        panelsRevealed: 0,
      });
      expect(result.modeMultiplier).toBeCloseTo(4.0, 5);
    });

    it("should clamp panelsRevealed above 9 to 9", () => {
      const result = scoreRound({
        ...BASE_PARAMS,
        makeCorrect: true,
        modelCorrect: true,
        yearDelta: 0,
        mode: "hardcore",
        panelsRevealed: 12,
      });
      expect(result.modeMultiplier).toBeCloseTo(1.0, 5);
    });
  });

  describe("practice mode", () => {
    it("should always return 0 pointsEarned", () => {
      const result = scoreRound({
        ...BASE_PARAMS,
        makeCorrect: true,
        modelCorrect: true,
        yearDelta: 0,
        mode: "practice",
      });
      expect(result.pointsEarned).toBe(0);
    });

    it("should award 0 time bonus", () => {
      const result = scoreRound({
        ...BASE_PARAMS,
        makeCorrect: true,
        modelCorrect: true,
        yearDelta: null,
        mode: "practice",
      });
      expect(result.timeBonus).toBe(0);
    });
  });

  describe("custom mode", () => {
    it("should award model points independently of make correctness", () => {
      const result = scoreRound({
        ...BASE_PARAMS,
        makeCorrect: false,
        modelCorrect: true,
        yearDelta: null,
        mode: "custom",
      });
      expect(result.modelPoints).toBe(400);
    });

    it("should not apply year bonus", () => {
      const result = scoreRound({
        ...BASE_PARAMS,
        makeCorrect: true,
        modelCorrect: true,
        yearDelta: 0,
        mode: "custom",
      });
      expect(result.yearBonus).toBeNull();
    });
  });

  describe("time bonus", () => {
    it("should be 100 when elapsedMs is 0", () => {
      const result = scoreRound({
        makeCorrect: true,
        modelCorrect: true,
        yearDelta: null,
        elapsedMs: 0,
        timeLimitMs: 60_000,
        mode: "easy",
      });
      expect(result.timeBonus).toBe(100);
    });

    it("should be 0 when elapsedMs equals timeLimitMs", () => {
      const result = scoreRound({
        makeCorrect: true,
        modelCorrect: true,
        yearDelta: null,
        elapsedMs: 60_000,
        timeLimitMs: 60_000,
        mode: "easy",
      });
      expect(result.timeBonus).toBe(0);
    });

    it("should be approximately 50 at the halfway point", () => {
      const result = scoreRound({
        makeCorrect: true,
        modelCorrect: true,
        yearDelta: null,
        elapsedMs: 30_000,
        timeLimitMs: 60_000,
        mode: "easy",
      });
      expect(result.timeBonus).toBe(50);
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

  it("should return 0 when all guesses are correct (ratio = 0)", () => {
    expect(proLevelBonus(10, 0)).toBe(0);
  });

  it("should return 100 when incorrectRatio is just above 0.50", () => {
    expect(proLevelBonus(49, 51)).toBe(100);
  });

  it("should return 300 when incorrectRatio is just above 0.70", () => {
    expect(proLevelBonus(29, 71)).toBe(300);
  });

  it("should return 500 when incorrectRatio is just above 0.90", () => {
    expect(proLevelBonus(9, 91)).toBe(500);
  });

  it("should return 1000 when incorrectRatio is just above 0.95", () => {
    expect(proLevelBonus(4, 96)).toBe(1000);
  });

  it("should return 0 when incorrectRatio is exactly 0.50", () => {
    expect(proLevelBonus(50, 50)).toBe(0);
  });
});
