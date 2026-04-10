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
  it("should return 0 for identical values", () => {
    expect(hammingDistance(0n, 0n)).toBe(0);
    expect(hammingDistance(0xdeadbeefn, 0xdeadbeefn)).toBe(0);
  });

  it("should return 1 for values differing by exactly one bit", () => {
    expect(hammingDistance(0n, 1n)).toBe(1);
    expect(hammingDistance(0b1000n, 0b1001n)).toBe(1);
  });

  it("should count all differing bits", () => {
    // 0b101 XOR 0b011 = 0b110 — 2 bits differ
    expect(hammingDistance(0b101n, 0b011n)).toBe(2);
    // 0x00 XOR 0xFF — 8 bits differ
    expect(hammingDistance(0n, 0xffn)).toBe(8);
  });

  it("should be symmetric", () => {
    const a = 0xabcdn;
    const b = 0x1234n;
    expect(hammingDistance(a, b)).toBe(hammingDistance(b, a));
  });
});
