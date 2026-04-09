import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/practice/stats/route";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    player: { findUnique: vi.fn() },
    playerDimensionStats: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const { prisma } = await import("@/app/lib/prisma");

const PLAYER = { id: "player-1", username: "testuser" };

function makePostRequest(body: object) {
  return new NextRequest("http://localhost/api/practice/stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/practice/stats");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/practice/stats", () => {
  it("should return 400 when username is missing", async () => {
    const res = await POST(makePostRequest({ dimensionType: "category", dimensionKey: "sports", correct: 1, incorrect: 0 }));
    expect(res.status).toBe(400);
  });

  it("should return 400 when dimensionType is missing", async () => {
    const res = await POST(makePostRequest({ username: "testuser", dimensionKey: "sports", correct: 1, incorrect: 0 }));
    expect(res.status).toBe(400);
  });

  it("should return 400 for an invalid dimensionType", async () => {
    const res = await POST(makePostRequest({ username: "testuser", dimensionType: "invalid", dimensionKey: "sports", correct: 1, incorrect: 0 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/dimensionType/i);
  });

  it("should return 404 when player does not exist", async () => {
    vi.mocked(prisma.player.findUnique).mockResolvedValue(null);
    const res = await POST(makePostRequest({ username: "nobody", dimensionType: "category", dimensionKey: "sports", correct: 1, incorrect: 0 }));
    expect(res.status).toBe(404);
  });

  it("should upsert stats and return the result for a new record", async () => {
    vi.mocked(prisma.player.findUnique).mockResolvedValue(PLAYER as never);
    vi.mocked(prisma.playerDimensionStats.findUnique).mockResolvedValue(null);
    const statsRecord = { id: "s-1", correct: 3, incorrect: 0, streak: 3 };
    vi.mocked(prisma.playerDimensionStats.upsert).mockResolvedValue(statsRecord as never);

    const res = await POST(makePostRequest({ username: "testuser", dimensionType: "category", dimensionKey: "sports", correct: 3, incorrect: 0 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.correct).toBe(3);
  });

  it("should accumulate correct and incorrect counts on top of existing stats", async () => {
    vi.mocked(prisma.player.findUnique).mockResolvedValue(PLAYER as never);
    vi.mocked(prisma.playerDimensionStats.findUnique).mockResolvedValue({ correct: 5, incorrect: 2, streak: 3 } as never);
    vi.mocked(prisma.playerDimensionStats.upsert).mockResolvedValue({ correct: 8, incorrect: 3, streak: 4 } as never);

    await POST(makePostRequest({ username: "testuser", dimensionType: "category", dimensionKey: "sports", correct: 3, incorrect: 1 }));

    expect(vi.mocked(prisma.playerDimensionStats.upsert)).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ correct: 8, incorrect: 3, streak: 0 }),
      })
    );
  });

  it("should increment streak when incorrect is 0", async () => {
    vi.mocked(prisma.player.findUnique).mockResolvedValue(PLAYER as never);
    vi.mocked(prisma.playerDimensionStats.findUnique).mockResolvedValue({ correct: 5, incorrect: 2, streak: 3 } as never);
    vi.mocked(prisma.playerDimensionStats.upsert).mockResolvedValue({} as never);

    await POST(makePostRequest({ username: "testuser", dimensionType: "region", dimensionKey: "europe", correct: 2, incorrect: 0 }));

    expect(vi.mocked(prisma.playerDimensionStats.upsert)).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ streak: 5 }),
      })
    );
  });

  it("should reset streak to 0 when incorrect > 0", async () => {
    vi.mocked(prisma.player.findUnique).mockResolvedValue(PLAYER as never);
    vi.mocked(prisma.playerDimensionStats.findUnique).mockResolvedValue({ correct: 5, incorrect: 0, streak: 10 } as never);
    vi.mocked(prisma.playerDimensionStats.upsert).mockResolvedValue({} as never);

    await POST(makePostRequest({ username: "testuser", dimensionType: "country", dimensionKey: "JP", correct: 1, incorrect: 1 }));

    expect(vi.mocked(prisma.playerDimensionStats.upsert)).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ streak: 0 }),
      })
    );
  });
});

describe("GET /api/practice/stats", () => {
  it("should return 400 when username is missing", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(400);
  });

  it("should return an empty array when the player does not exist", async () => {
    vi.mocked(prisma.player.findUnique).mockResolvedValue(null);
    const res = await GET(makeGetRequest({ username: "nobody" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it("should return stats for an existing player", async () => {
    vi.mocked(prisma.player.findUnique).mockResolvedValue(PLAYER as never);
    vi.mocked(prisma.playerDimensionStats.findMany).mockResolvedValue([
      { id: "s-1", dimensionType: "category", dimensionKey: "sports", correct: 5, incorrect: 2, streak: 3 },
    ] as never);

    const res = await GET(makeGetRequest({ username: "testuser" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].dimensionKey).toBe("sports");
  });
});
