import { describe, it, expect } from "vitest";
import { eraFromYear } from "@/app/lib/constants";

describe("eraFromYear", () => {
  it("should return 'classic' for years before 1970", () => {
    expect(eraFromYear(1969)).toBe("classic");
    expect(eraFromYear(1955)).toBe("classic");
  });

  it("should return 'retro' for 1970 through 1999", () => {
    expect(eraFromYear(1970)).toBe("retro");
    expect(eraFromYear(1985)).toBe("retro");
    expect(eraFromYear(1999)).toBe("retro");
  });

  it("should return 'modern' for 2000 through 2014", () => {
    expect(eraFromYear(2000)).toBe("modern");
    expect(eraFromYear(2010)).toBe("modern");
    expect(eraFromYear(2014)).toBe("modern");
  });

  it("should return 'contemporary' for 2015 and later", () => {
    expect(eraFromYear(2015)).toBe("contemporary");
    expect(eraFromYear(2024)).toBe("contemporary");
  });
});
