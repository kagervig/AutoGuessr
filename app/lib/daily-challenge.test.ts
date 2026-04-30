// Tests for daily challenge helpers (pure logic only — DB functions require integration tests).

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import type { DailyChallenge } from "../generated/prisma/client";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    dailyChallenge: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

const { prisma } = await import("@/app/lib/prisma");
const { pickImageIdsForChallenge, generateChallengesForRange } = await import(
  "@/app/lib/daily-challenge"
);

function makeChallenge(overrides: Partial<DailyChallenge> & { challengeNumber: number; date: Date }): DailyChallenge {
  return {
    id: 1,
    imageIds: [],
    isPublished: true,
    curatedBy: null,
    generatedAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  } as DailyChallenge;
}

const TEN_IMAGE_ROWS = Array.from({ length: 10 }, (_, i) => ({ id: `img-${i + 1}` }));
const TEN_IMAGE_IDS = TEN_IMAGE_ROWS.map((r) => r.id);

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// pickImageIdsForChallenge
// ---------------------------------------------------------------------------

describe("pickImageIdsForChallenge", () => {
  it("should return image IDs from the query result", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue(TEN_IMAGE_ROWS);
    const ids = await pickImageIdsForChallenge(10);
    expect(ids).toEqual(TEN_IMAGE_IDS);
  });

  it("should throw when the DB returns fewer images than requested", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: "img-1" }, { id: "img-2" }]);
    await expect(pickImageIdsForChallenge(10)).rejects.toThrow(
      "Not enough active images to generate a challenge (need 10, got 2)"
    );
  });
});

// ---------------------------------------------------------------------------
// generateChallengesForRange
// ---------------------------------------------------------------------------

describe("generateChallengesForRange", () => {
  beforeEach(() => {
    vi.mocked(prisma.dailyChallenge.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.$queryRaw).mockResolvedValue(TEN_IMAGE_ROWS);
    vi.mocked(prisma.dailyChallenge.create).mockResolvedValue(
      makeChallenge({ challengeNumber: 1, date: new Date("2025-01-01T00:00:00Z") })
    );
  });

  it("should skip a date that already has a challenge", async () => {
    const date = new Date("2025-01-15T00:00:00Z");
    vi.mocked(prisma.dailyChallenge.findUnique).mockResolvedValue(
      makeChallenge({ challengeNumber: 1, date })
    );

    const result = await generateChallengesForRange(date, date);

    expect(result.skipped).toEqual(["2025-01-15"]);
    expect(result.created).toHaveLength(0);
  });

  it("should create a challenge when none exists for the date", async () => {
    const date = new Date("2025-01-15T00:00:00Z");
    vi.mocked(prisma.dailyChallenge.findUnique).mockResolvedValue(null);

    const result = await generateChallengesForRange(date, date);

    expect(result.created).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);
  });

  it("should assign challengeNumber 1 when no previous challenges exist", async () => {
    const date = new Date("2025-01-15T00:00:00Z");
    vi.mocked(prisma.dailyChallenge.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.dailyChallenge.findUnique).mockResolvedValue(null);

    await generateChallengesForRange(date, date);

    const createCall = vi.mocked(prisma.dailyChallenge.create).mock.calls[0][0];
    expect(createCall.data.challengeNumber).toBe(1);
  });

  it("should continue challengeNumber from the last existing challenge", async () => {
    const date = new Date("2025-01-15T00:00:00Z");
    vi.mocked(prisma.dailyChallenge.findFirst).mockResolvedValue(
      makeChallenge({ challengeNumber: 42, date: new Date("2025-01-14T00:00:00Z") })
    );
    vi.mocked(prisma.dailyChallenge.findUnique).mockResolvedValue(null);

    await generateChallengesForRange(date, date);

    const createCall = vi.mocked(prisma.dailyChallenge.create).mock.calls[0][0];
    expect(createCall.data.challengeNumber).toBe(43);
  });

  it("should look up yesterday's challenge to build the image exclusion list", async () => {
    const date = new Date("2025-01-15T00:00:00Z");
    const yesterday = new Date("2025-01-14T00:00:00Z");

    vi.mocked(prisma.dailyChallenge.findUnique)
      .mockResolvedValueOnce(null)  // today has no existing challenge
      .mockResolvedValueOnce(null); // yesterday's challenge lookup

    await generateChallengesForRange(date, date);

    const calls = vi.mocked(prisma.dailyChallenge.findUnique).mock.calls;
    const yesterdayLookup = calls[1][0].where.date as Date;
    expect(yesterdayLookup.toISOString()).toBe(yesterday.toISOString());
  });

  it("should process a multi-day range and mix creates and skips correctly", async () => {
    const jan13 = new Date("2025-01-13T00:00:00Z");
    const jan15 = new Date("2025-01-15T00:00:00Z");

    const existingChallenge = makeChallenge({ challengeNumber: 5, date: jan13 });

    vi.mocked(prisma.dailyChallenge.findUnique)
      // jan13: already exists → skip
      .mockResolvedValueOnce(existingChallenge)
      // jan14: doesn't exist → create
      .mockResolvedValueOnce(null)   // today check
      .mockResolvedValueOnce(null)   // yesterday (jan13) for exclusion lookup
      // jan15: doesn't exist → create
      .mockResolvedValueOnce(null)   // today check
      .mockResolvedValueOnce(null);  // yesterday (jan14) for exclusion lookup

    const result = await generateChallengesForRange(jan13, jan15);

    expect(result.skipped).toEqual(["2025-01-13"]);
    expect(result.created).toHaveLength(2);
  });

  it("should increment challengeNumber for each created challenge in a range", async () => {
    const jan14 = new Date("2025-01-14T00:00:00Z");
    const jan15 = new Date("2025-01-15T00:00:00Z");

    vi.mocked(prisma.dailyChallenge.findFirst).mockResolvedValue(
      makeChallenge({ challengeNumber: 10, date: new Date("2025-01-13T00:00:00Z") })
    );
    vi.mocked(prisma.dailyChallenge.findUnique).mockResolvedValue(null);

    await generateChallengesForRange(jan14, jan15);

    const createCalls = vi.mocked(prisma.dailyChallenge.create).mock.calls;
    expect(createCalls[0][0].data.challengeNumber).toBe(11);
    expect(createCalls[1][0].data.challengeNumber).toBe(12);
  });
});
