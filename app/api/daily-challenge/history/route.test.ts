// Tests for GET /api/daily-challenge/history
import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/app/lib/prisma", () => ({
  prisma: { $queryRaw: vi.fn() },
}));

import { GET } from "./route";
import { prisma } from "@/app/lib/prisma";

function makeRequest(params?: Record<string, string>) {
  const url = new URL("http://localhost/api/daily-challenge/history");
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

const PLAYED_ROW = {
  challengeId: 1,
  date: new Date("2026-01-15T00:00:00.000Z"),
  totalScore: 5000,
  completedAt: new Date("2026-01-15T10:00:00Z"),
  rank: BigInt(3),
  totalPlayers: BigInt(10),
};

const UNPLAYED_ROW = {
  challengeId: 2,
  date: new Date("2026-01-16T00:00:00.000Z"),
  totalScore: null,
  completedAt: null,
  rank: null,
  totalPlayers: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.$queryRaw).mockResolvedValue([PLAYED_ROW, UNPLAYED_ROW]);
});

describe("GET /api/daily-challenge/history", () => {
  it("returns 400 when month is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
  });

  it("returns 400 when month format is invalid", async () => {
    const res = await GET(makeRequest({ month: "2026-1" }));
    expect(res.status).toBe(400);
  });

  it("returns days array for a valid month", async () => {
    const res = await GET(makeRequest({ month: "2026-01", playerId: "player-1" }));
    expect(res.status).toBe(200);
    const { days } = await res.json();
    expect(days).toHaveLength(2);
  });

  it("maps a played row correctly", async () => {
    const res = await GET(makeRequest({ month: "2026-01", playerId: "player-1" }));
    const { days } = await res.json();
    const played = days.find((d: { challengeId: number }) => d.challengeId === 1);
    expect(played.played).toBe(true);
    expect(played.date).toBe("2026-01-15");
    expect(played.totalScore).toBe(5000);
    expect(played.rank).toBe(3);
    expect(played.totalPlayers).toBe(10);
  });

  it("maps an unplayed row correctly", async () => {
    const res = await GET(makeRequest({ month: "2026-01", playerId: "player-1" }));
    const { days } = await res.json();
    const unplayed = days.find((d: { challengeId: number }) => d.challengeId === 2);
    expect(unplayed.played).toBe(false);
    expect(unplayed.totalScore).toBeNull();
    expect(unplayed.rank).toBeNull();
    expect(unplayed.totalPlayers).toBeNull();
  });

  it("returns empty days array when no challenges exist for the month", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
    const res = await GET(makeRequest({ month: "2026-01" }));
    const { days } = await res.json();
    expect(days).toHaveLength(0);
  });

  it("returns all days as unplayed when no playerId is provided", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([UNPLAYED_ROW, UNPLAYED_ROW]);
    const res = await GET(makeRequest({ month: "2026-01" }));
    const { days } = await res.json();
    expect(days.every((d: { played: boolean }) => !d.played)).toBe(true);
  });
});
