import { describe, it, expect } from "vitest";
import { calcGrade } from "./grade";

describe("calcGrade", () => {
  it("should return S for pct >= 0.9", () => {
    expect(calcGrade(0.9).grade).toBe("S");
    expect(calcGrade(1.0).grade).toBe("S");
  });

  it("should return A for pct >= 0.75 and < 0.9", () => {
    expect(calcGrade(0.75).grade).toBe("A");
    expect(calcGrade(0.89).grade).toBe("A");
  });

  it("should return B for pct >= 0.55 and < 0.75", () => {
    expect(calcGrade(0.55).grade).toBe("B");
    expect(calcGrade(0.74).grade).toBe("B");
  });

  it("should return C for pct >= 0.35 and < 0.55", () => {
    expect(calcGrade(0.35).grade).toBe("C");
    expect(calcGrade(0.54).grade).toBe("C");
  });

  it("should return D for pct < 0.35", () => {
    expect(calcGrade(0.0).grade).toBe("D");
    expect(calcGrade(0.34).grade).toBe("D");
  });

  it("should return the correct Tailwind colour class for each grade", () => {
    expect(calcGrade(1.0).color).toBe("text-yellow-400");    // S
    expect(calcGrade(0.8).color).toBe("text-green-400");     // A
    expect(calcGrade(0.6).color).toBe("text-blue-400");      // B
    expect(calcGrade(0.4).color).toBe("text-muted-foreground"); // C
    expect(calcGrade(0.1).color).toBe("text-muted-foreground"); // D
  });
});
