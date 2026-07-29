// Tests for useDailyChallengeHistory — focuses on the API-to-CalendarDayData mapping.
import { describe, it, expect } from "vitest";
import { mapHistoryToDayData, type HistoryApiDay } from "./useDailyChallengeHistory";

const TODAY = "2026-06-08";
const YEAR = 2026;
const MONTH = 6;

function day(overrides: Partial<HistoryApiDay> & { date: string }): HistoryApiDay {
  return {
    challengeId: 1,
    played: false,
    totalScore: null,
    rank: null,
    totalPlayers: null,
    ...overrides,
  };
}

describe("mapHistoryToDayData", () => {
  it("maps a played entry to played state with score, rank, and totalPlayers", () => {
    const result = mapHistoryToDayData(
      [day({ date: "2026-06-01", played: true, totalScore: 5000, rank: 3, totalPlayers: 100 })],
      YEAR,
      MONTH,
      TODAY,
    );
    expect(result.find((d) => d.dateStr === "2026-06-01")).toMatchObject({
      state: "played",
      score: 5000,
      rank: 3,
      totalPlayers: 100,
    });
  });

  it("maps an unplayed entry to unplayed state without score", () => {
    const result = mapHistoryToDayData(
      [day({ date: "2026-06-02", played: false })],
      YEAR,
      MONTH,
      TODAY,
    );
    const entry = result.find((d) => d.dateStr === "2026-06-02");
    expect(entry?.state).toBe("unplayed");
    expect(entry?.score).toBeUndefined();
    expect(entry?.rank).toBeUndefined();
  });

  it("returns no-challenge for past days with no API entry", () => {
    const result = mapHistoryToDayData([], YEAR, MONTH, TODAY);
    expect(result.find((d) => d.dateStr === "2026-06-01")?.state).toBe("no-challenge");
  });

  it("returns future for dates after today", () => {
    const result = mapHistoryToDayData([], YEAR, MONTH, TODAY);
    expect(result.find((d) => d.dateStr === "2026-06-09")?.state).toBe("future");
  });

  it("returns one entry for every day in the month", () => {
    const result = mapHistoryToDayData([], YEAR, MONTH, TODAY);
    expect(result).toHaveLength(30); // June has 30 days
  });
});
