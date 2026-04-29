// Tests for daily challenge helpers (pure logic only — DB functions require integration tests).

import { describe, it, expect, vi, afterEach } from "vitest";
import { startOfTodayUTC, isChallengeAccessible } from "./daily-challenge";

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// startOfTodayUTC
// ---------------------------------------------------------------------------

describe("startOfTodayUTC", () => {
  it("should return midnight UTC for the current date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T15:30:00Z"));

    const result = startOfTodayUTC();

    expect(result.toISOString()).toBe("2026-04-29T00:00:00.000Z");
  });

  it("should return midnight UTC even when local time is in a different calendar day", () => {
    vi.useFakeTimers();
    // UTC is still April 28 even though some timezones are April 29
    vi.setSystemTime(new Date("2026-04-28T23:45:00Z"));

    const result = startOfTodayUTC();

    expect(result.toISOString()).toBe("2026-04-28T00:00:00.000Z");
  });
});

// ---------------------------------------------------------------------------
// isChallengeAccessible
// ---------------------------------------------------------------------------

describe("isChallengeAccessible", () => {
  it("should return true for a challenge dated today UTC", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T12:00:00Z"));

    expect(isChallengeAccessible({ date: new Date("2026-04-29T00:00:00.000Z") })).toBe(true);
  });

  it("should return true for a challenge dated in the past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T12:00:00Z"));

    expect(isChallengeAccessible({ date: new Date("2026-04-01T00:00:00.000Z") })).toBe(true);
  });

  it("should return false for a challenge dated tomorrow UTC", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T23:59:59Z"));

    expect(isChallengeAccessible({ date: new Date("2026-04-30T00:00:00.000Z") })).toBe(false);
  });

  it("should return false for a challenge dated in the future", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T00:00:00Z"));

    expect(isChallengeAccessible({ date: new Date("2026-05-15T00:00:00.000Z") })).toBe(false);
  });
});
