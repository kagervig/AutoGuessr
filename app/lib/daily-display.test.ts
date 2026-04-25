import { describe, it, expect } from "vitest";
import { roundEmoji, dailyPercent, formatPercent } from "./daily-display";
import { MAX_DAILY_ROUND_SCORE, ROUNDS_PER_GAME } from "./constants";

const MAX_BASE = ROUNDS_PER_GAME * MAX_DAILY_ROUND_SCORE; // 8000

describe("roundEmoji", () => {
  it("returns 🟢 for score >= 80% of MAX_DAILY_ROUND_SCORE", () => {
    const threshold = MAX_DAILY_ROUND_SCORE * 0.8; // 640
    expect(roundEmoji(640)).toBe("🟢");
    expect(roundEmoji(700)).toBe("🟢");
    expect(roundEmoji(800)).toBe("🟢");
  });

  it("returns 🟡 for score >= 40% but < 80%", () => {
    const low = MAX_DAILY_ROUND_SCORE * 0.4; // 320
    expect(roundEmoji(low)).toBe("🟡");
    expect(roundEmoji(480)).toBe("🟡");
    expect(roundEmoji(MAX_DAILY_ROUND_SCORE * 0.8 - 1)).toBe("🟡");
  });

  it("returns 🔴 for score < 40%", () => {
    expect(roundEmoji(0)).toBe("🔴");
    expect(roundEmoji(MAX_DAILY_ROUND_SCORE * 0.4 - 1)).toBe("🔴");
    expect(roundEmoji(100)).toBe("🔴");
  });

  it("handles boundary at 40%", () => {
    const boundary = MAX_DAILY_ROUND_SCORE * 0.4;
    expect(roundEmoji(boundary)).toBe("🟡");
    expect(roundEmoji(boundary - 1)).toBe("🔴");
  });

  it("handles boundary at 80%", () => {
    const boundary = MAX_DAILY_ROUND_SCORE * 0.8;
    expect(roundEmoji(boundary)).toBe("🟢");
    expect(roundEmoji(boundary - 1)).toBe("🟡");
  });
});

describe("dailyPercent", () => {
  it("returns 0 for score 0", () => {
    expect(dailyPercent(0)).toBe(0);
  });

  it("returns 0.5 for half the max base", () => {
    expect(dailyPercent(MAX_BASE / 2)).toBe(0.5);
  });

  it("returns 1 for full max base", () => {
    expect(dailyPercent(MAX_BASE)).toBe(1);
  });

  it("clamps to 1 for scores exceeding max base", () => {
    expect(dailyPercent(MAX_BASE + 1000)).toBe(1);
    expect(dailyPercent(MAX_BASE * 2)).toBe(1);
  });

  it("handles fractional scores", () => {
    expect(dailyPercent(MAX_BASE * 0.25)).toBe(0.25);
    expect(dailyPercent(MAX_BASE * 0.75)).toBeCloseTo(0.75, 5);
    expect(dailyPercent(MAX_BASE * 0.9)).toBeCloseTo(0.9, 5);
  });
});

describe("formatPercent", () => {
  it("formats 0 as '0%'", () => {
    expect(formatPercent(0)).toBe("0%");
  });

  it("formats 0.5 as '50%'", () => {
    expect(formatPercent(0.5)).toBe("50%");
  });

  it("formats 1 as '100%'", () => {
    expect(formatPercent(1)).toBe("100%");
  });

  it("rounds to nearest integer", () => {
    expect(formatPercent(0.501)).toBe("50%");
    expect(formatPercent(0.555)).toBe("56%");
    expect(formatPercent(0.999)).toBe("100%");
  });

  it("handles small decimals", () => {
    expect(formatPercent(0.001)).toBe("0%");
    expect(formatPercent(0.01)).toBe("1%");
    expect(formatPercent(0.99)).toBe("99%");
  });
});
