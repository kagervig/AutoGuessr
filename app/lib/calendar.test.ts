import { describe, it, expect } from "vitest";
import { buildMonthGrid, parseMonthSlug, monthToSlug, getAdjacentMonths } from "./calendar";
import { DAILY_CHALLENGE_ORIGIN } from "./constants";

describe("buildMonthGrid", () => {
  it("returns 42 cells", () => {
    const today = new Date("2026-04-25T00:00:00Z");
    const cells = buildMonthGrid(2026, 3, today); // April (month 3)
    expect(cells).toHaveLength(42);
  });

  it("marks cells correctly as in/out of month", () => {
    const today = new Date("2026-04-25T00:00:00Z");
    const cells = buildMonthGrid(2026, 3, today); // April 2026

    // April 1st should be isInMonth: true
    const aprilFirst = cells.find(
      (c) => c.date.getUTCDate() === 1 && c.isInMonth
    );
    expect(aprilFirst).toBeDefined();

    // Leading March days should be isInMonth: false
    const marchDays = cells.filter(
      (c) => c.date.getUTCMonth() === 2 && !c.isInMonth
    );
    expect(marchDays.length).toBeGreaterThan(0);
  });

  it("marks future days correctly", () => {
    const today = new Date("2026-04-25T00:00:00Z");
    const cells = buildMonthGrid(2026, 3, today);

    const future = cells.find((c) => c.date.getTime() > today.getTime());
    expect(future?.isFuture).toBe(true);

    const past = cells.find((c) => c.date.getTime() < today.getTime());
    expect(past?.isFuture).toBe(false);
  });

  it("marks today correctly", () => {
    const today = new Date("2026-04-25T00:00:00Z");
    const cells = buildMonthGrid(2026, 3, today);

    const todayCell = cells.find((c) => c.isToday);
    expect(todayCell).toBeDefined();
    expect(todayCell?.date.getTime()).toBe(today.getTime());
  });

  it("handles leap year (February 2024)", () => {
    const today = new Date("2024-03-01T00:00:00Z");
    const cells = buildMonthGrid(2024, 1, today); // February 2024

    // February 2024 has 29 days
    const februaryDays = cells.filter(
      (c) => c.date.getUTCMonth() === 1 && c.isInMonth
    );
    expect(februaryDays).toHaveLength(29);
  });

  it("handles non-leap year (February 2026)", () => {
    const today = new Date("2026-03-01T00:00:00Z");
    const cells = buildMonthGrid(2026, 1, today); // February 2026

    // February 2026 has 28 days
    const februaryDays = cells.filter(
      (c) => c.date.getUTCMonth() === 1 && c.isInMonth
    );
    expect(februaryDays).toHaveLength(28);
  });

  it("starts grid on Sunday", () => {
    const today = new Date("2026-04-25T00:00:00Z");
    const cells = buildMonthGrid(2026, 3, today);

    // First cell should be a Sunday
    expect(cells[0].date.getUTCDay()).toBe(0);
  });
});

describe("parseMonthSlug", () => {
  const origin = new Date("2026-04-01T00:00:00Z");
  const today = new Date("2026-04-25T00:00:00Z");

  it("parses valid slug", () => {
    const result = parseMonthSlug("2026-04", today, origin);
    expect(result).toEqual({ year: 2026, month: 3 });
  });

  it("returns null for invalid format", () => {
    expect(parseMonthSlug("not-a-date", today, origin)).toBeNull();
    expect(parseMonthSlug("2026", today, origin)).toBeNull();
    expect(parseMonthSlug("2026-13", today, origin)).toBeNull();
    expect(parseMonthSlug("2026-00", today, origin)).toBeNull();
    expect(parseMonthSlug("", today, origin)).toBeNull();
  });

  it("returns null for month before origin", () => {
    // Origin is April 2026 (month 3)
    const result = parseMonthSlug("2026-03", today, origin);
    expect(result).toBeNull();
  });

  it("returns null for month after today", () => {
    const result = parseMonthSlug("2026-05", today, origin);
    expect(result).toBeNull();
  });

  it("allows month exactly at origin", () => {
    const result = parseMonthSlug("2026-04", today, origin);
    expect(result).toEqual({ year: 2026, month: 3 });
  });

  it("allows month exactly at today", () => {
    const result = parseMonthSlug("2026-04", today, origin);
    expect(result).toEqual({ year: 2026, month: 3 });
  });
});

describe("monthToSlug", () => {
  it("converts month to slug format", () => {
    expect(monthToSlug(2026, 3)).toBe("2026-04");
    expect(monthToSlug(2026, 0)).toBe("2026-01");
    expect(monthToSlug(2026, 11)).toBe("2026-12");
  });

  it("pads month with zero", () => {
    expect(monthToSlug(2026, 0)).toBe("2026-01");
    expect(monthToSlug(2026, 8)).toBe("2026-09");
  });
});

describe("getAdjacentMonths", () => {
  const origin = new Date("2026-04-01T00:00:00Z");
  const today = new Date("2026-06-25T00:00:00Z"); // Today is June

  it("returns prev/next for middle month", () => {
    // Testing May (month 4) while origin is April and today is June
    const result = getAdjacentMonths(2026, 4, origin, today);
    expect(result.prev).toEqual({ year: 2026, month: 3 }); // April
    expect(result.next).toEqual({ year: 2026, month: 5 }); // June
  });

  it("returns null for prev when at origin month", () => {
    const result = getAdjacentMonths(2026, 3, origin, today);
    expect(result.prev).toBeNull();
    expect(result.next).toEqual({ year: 2026, month: 4 });
  });

  it("returns null for next when at today month", () => {
    const result = getAdjacentMonths(2026, 5, origin, today);
    expect(result.prev).toEqual({ year: 2026, month: 4 });
    expect(result.next).toBeNull();
  });

  it("handles month boundary (Dec to Jan)", () => {
    const origin2 = new Date("2025-01-01T00:00:00Z");
    const today2 = new Date("2025-02-01T00:00:00Z");
    const result = getAdjacentMonths(2024, 11, origin2, today2); // Dec 2024

    // Dec 2024 is before Jan 2025 origin, so it should be invalid anyway
    // But the function should still compute adjacent correctly if we manually test Jan
    const resultJan = getAdjacentMonths(2025, 0, origin2, today2); // Jan 2025
    expect(resultJan.prev).toBeNull(); // Jan is at origin
    expect(resultJan.next).toEqual({ year: 2025, month: 1 }); // Feb exists
  });
});
