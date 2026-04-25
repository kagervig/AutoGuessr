// Tests for pure helpers in daily-challenge.ts.
import { describe, it, expect } from "vitest";
import { getTodayUTCMidnight, getChallengeNumber, toUTCMidnight } from "./daily-challenge";
import { DAILY_CHALLENGE_ORIGIN } from "./constants";

describe("toUTCMidnight", () => {
  it("normalises a date with time to UTC midnight", () => {
    const d = new Date("2026-04-24T15:30:00Z");
    const result = toUTCMidnight(d);
    expect(result.toISOString()).toBe("2026-04-24T00:00:00.000Z");
  });

  it("leaves UTC midnight unchanged", () => {
    const d = new Date("2026-04-24T00:00:00Z");
    expect(toUTCMidnight(d).toISOString()).toBe("2026-04-24T00:00:00.000Z");
  });

  it("does not mutate the input", () => {
    const d = new Date("2026-04-24T15:00:00Z");
    const original = d.toISOString();
    toUTCMidnight(d);
    expect(d.toISOString()).toBe(original);
  });
});

describe("getChallengeNumber", () => {
  it("returns 1 for the origin date", () => {
    expect(getChallengeNumber(DAILY_CHALLENGE_ORIGIN)).toBe(1);
  });

  it("returns 2 for the day after origin", () => {
    const next = new Date(DAILY_CHALLENGE_ORIGIN.getTime() + 24 * 60 * 60 * 1000);
    expect(getChallengeNumber(next)).toBe(2);
  });

  it("returns 7 for six days after origin", () => {
    const sixDaysLater = new Date(DAILY_CHALLENGE_ORIGIN.getTime() + 6 * 24 * 60 * 60 * 1000);
    expect(getChallengeNumber(sixDaysLater)).toBe(7);
  });

  it("normalises non-midnight input to UTC midnight before computing", () => {
    const withTime = new Date(DAILY_CHALLENGE_ORIGIN.toISOString().replace("T00:", "T14:"));
    expect(getChallengeNumber(withTime)).toBe(1);
  });
});

describe("getTodayUTCMidnight", () => {
  it("returns a Date at exactly UTC midnight", () => {
    const result = getTodayUTCMidnight();
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });
});
