import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/session/route";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    gameSession: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/app/lib/game", () => ({
  imageUrl: vi.fn((filename: string) => `https://cdn.example.com/${filename}`),
}));

const { prisma } = await import("@/app/lib/prisma");

const GAME_ID = "game-abc123";

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/session");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/session", () => {
  it("should return 400 when gameId is missing", async () => {
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("gameId is required");
  });

  it("should return 400 when only sessionId is provided (param renamed)", async () => {
    const res = await GET(makeRequest({ sessionId: GAME_ID }));
    expect(res.status).toBe(400);
  });

  it("should return 404 when session not found", async () => {
    vi.mocked(prisma.gameSession.findUnique).mockResolvedValue(null);
    const res = await GET(makeRequest({ gameId: GAME_ID }));
    expect(res.status).toBe(404);
  });

  it("should return 200 with session data when found", async () => {
    vi.mocked(prisma.gameSession.findUnique).mockResolvedValue({
      id: GAME_ID,
      playerId: null,
      mode: "standard",
      finalScore: 1500,
      rounds: [],
    } as never);
    const res = await GET(makeRequest({ gameId: GAME_ID }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(GAME_ID);
  });
});
