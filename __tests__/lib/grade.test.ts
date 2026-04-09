import { describe, it, expect } from "vitest";
import { calcGrade, GRADE_HEX, APPROX_MAX_PER_ROUND } from "@/app/lib/grade";

describe("calcGrade", () => {
  it("should return S grade at 90%", () => {
    expect(calcGrade(0.9).grade).toBe("S");
  });

  it("should return S grade at 100%", () => {
    expect(calcGrade(1.0).grade).toBe("S");
  });

  it("should return A grade at 75%", () => {
    expect(calcGrade(0.75).grade).toBe("A");
  });

  it("should return A grade at 89%", () => {
    expect(calcGrade(0.89).grade).toBe("A");
  });

  it("should return B grade at 55%", () => {
    expect(calcGrade(0.55).grade).toBe("B");
  });

  it("should return B grade at 74%", () => {
    expect(calcGrade(0.74).grade).toBe("B");
  });

  it("should return C grade at 35%", () => {
    expect(calcGrade(0.35).grade).toBe("C");
  });

  it("should return C grade at 54%", () => {
    expect(calcGrade(0.54).grade).toBe("C");
  });

  it("should return D grade at 34%", () => {
    expect(calcGrade(0.34).grade).toBe("D");
  });

  it("should return D grade at 0%", () => {
    expect(calcGrade(0).grade).toBe("D");
  });
});

describe("GRADE_HEX", () => {
  it("should have a hex value for every grade letter", () => {
    const grades = ["S", "A", "B", "C", "D"];
    for (const g of grades) {
      expect(GRADE_HEX[g]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("APPROX_MAX_PER_ROUND", () => {
  it("should be a positive number", () => {
    expect(APPROX_MAX_PER_ROUND).toBeGreaterThan(0);
  });
});
