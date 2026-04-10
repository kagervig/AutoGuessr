import { describe, it, expect } from "vitest";
import { dct1d, hammingDistance } from "./phash";

describe("dct1d", () => {
  it("should return DC component equal to 2 for constant signal [1, 1, 1, 1]", () => {
    // For N=4 and all-ones input: scale(0) * N * 1 = sqrt(1/4) * 4 = 2
    const result = dct1d([1, 1, 1, 1]);
    expect(result[0]).toBeCloseTo(2, 5);
  });

  it("should return near-zero AC components for a constant signal", () => {
    const result = dct1d([1, 1, 1, 1]);
    expect(result[1]).toBeCloseTo(0, 5);
    expect(result[2]).toBeCloseTo(0, 5);
    expect(result[3]).toBeCloseTo(0, 5);
  });

  it("should return an array of the same length as the input", () => {
    expect(dct1d([1, 2, 3, 4, 5, 6, 7, 8])).toHaveLength(8);
  });

  it("should be linear: dct(2x) = 2 * dct(x)", () => {
    const x = [1, 2, 3, 4];
    const dctX = dct1d(x);
    const dct2X = dct1d(x.map((v) => v * 2));
    for (let i = 0; i < 4; i++) {
      expect(dct2X[i]).toBeCloseTo(dctX[i] * 2, 5);
    }
  });
});

describe("hammingDistance", () => {
  // Hashes are 16-char hex strings (64-bit)
  const ZERO = "0000000000000000";
  const ONE  = "0000000000000001"; // last bit set
  const EIGHT_BITS = "00000000000000ff"; // 8 low bits set

  it("should return 0 for identical hashes", () => {
    expect(hammingDistance(ZERO, ZERO)).toBe(0);
    expect(hammingDistance("deadbeef12345678", "deadbeef12345678")).toBe(0);
  });

  it("should return 1 for hashes differing by exactly one bit", () => {
    expect(hammingDistance(ZERO, ONE)).toBe(1);
    // 0x8 = 0b1000, 0x9 = 0b1001 — one bit differs
    expect(hammingDistance("0000000000000008", "0000000000000009")).toBe(1);
  });

  it("should count all differing bits", () => {
    // 0x5 = 0b0101, 0x3 = 0b0011 — XOR = 0b0110 — 2 bits differ
    expect(hammingDistance("0000000000000005", "0000000000000003")).toBe(2);
    // 0x00 vs 0xff — 8 bits differ
    expect(hammingDistance(ZERO, EIGHT_BITS)).toBe(8);
  });

  it("should be symmetric", () => {
    const a = "abcd000000001234";
    const b = "1234000000001234";
    expect(hammingDistance(a, b)).toBe(hammingDistance(b, a));
  });
});
