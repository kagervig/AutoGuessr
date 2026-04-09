import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/leaderboard/route";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    gameSession: { findMany: vi.fn() },
  },
}));

const { prisma } = await import("@/app/lib/prisma");

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/leaderboard");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

function makeSession(overrides: object = {}) {
  return {
    id: "session-1",
    initials: "AAA",
    finalScore: 1500,
    mode: "standard",
    startedAt: new Date("2024-01-15T10:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/leaderboard", () => {
  it("should return ranked entries", async () => {
    vi.mocked(prisma.gameSession.findMany).mockResolvedValue([
      makeSession({ finalScore: 2000 }),
      makeSession({ id: "session-2", finalScore: 1500 }),
    ] as never);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data[0].rank).toBe(1);
    expect(data[0].score).toBe(2000);
    expect(data[1].rank).toBe(2);
  });

  it("should return an empty array when no sessions qualify", async () => {
    vi.mocked(prisma.gameSession.findMany).mockResolvedValue([] as never);

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it("should pass mode filter to the query when mode param is valid", async () => {
    vi.mocked(prisma.gameSession.findMany).mockResolvedValue([] as never);

    await GET(makeRequest({ mode: "hardcore" }));

    expect(vi.mocked(prisma.gameSession.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ mode: "hardcore" }),
      })
    );
  });

  it("should not filter by mode when mode param is invalid", async () => {
    vi.mocked(prisma.gameSession.findMany).mockResolvedValue([] as never);

    await GET(makeRequest({ mode: "invalid_mode" }));

    expect(vi.mocked(prisma.gameSession.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ mode: { in: expect.any(Array) } }),
      })
    );
  });

  it("should include a startedAt filter for day period", async () => {
    vi.mocked(prisma.gameSession.findMany).mockResolvedValue([] as never);

    await GET(makeRequest({ period: "day" }));

    expect(vi.mocked(prisma.gameSession.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startedAt: { gte: expect.any(Date) },
        }),
      })
    );
  });

  it("should include a startedAt filter for week period", async () => {
    vi.mocked(prisma.gameSession.findMany).mockResolvedValue([] as never);

    await GET(makeRequest({ period: "week" }));

    expect(vi.mocked(prisma.gameSession.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startedAt: { gte: expect.any(Date) },
        }),
      })
    );
  });

  it("should not include a startedAt filter for alltime period", async () => {
    vi.mocked(prisma.gameSession.findMany).mockResolvedValue([] as never);

    await GET(makeRequest({ period: "alltime" }));

    const call = vi.mocked(prisma.gameSession.findMany).mock.calls[0][0] as { where: Record<string, unknown> };
    expect(call.where.startedAt).toBeUndefined();
  });

  it("should include initials and mode in each entry", async () => {
    vi.mocked(prisma.gameSession.findMany).mockResolvedValue([
      makeSession({ initials: "EGG", mode: "easy", finalScore: 800 }),
    ] as never);

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data[0].initials).toBe("EGG");
    expect(data[0].mode).toBe("easy");
  });
});
