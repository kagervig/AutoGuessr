import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/session/end/route";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    gameSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    playerStats: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

const { prisma } = await import("@/app/lib/prisma");

const GAME_ID = "game-abc123";
const TOKEN = "secret-token";

function makeRequest(body: object, cookie?: string) {
  return new NextRequest("http://localhost/api/session/end", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/session/end", () => {
  it("should return 400 when gameId is missing", async () => {
    const res = await POST(makeRequest({ finalScore: 100 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("gameId is required");
  });

  it("should return 404 when session not found", async () => {
    vi.mocked(prisma.gameSession.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest({ gameId: GAME_ID, finalScore: 100 }));
    expect(res.status).toBe(404);
  });

  it("should return 401 when cookie is missing", async () => {
    vi.mocked(prisma.gameSession.findUnique).mockResolvedValue({
      id: GAME_ID,
      playerId: null,
      mode: "easy",
      endedAt: null,
      sessionToken: TOKEN,
      rounds: [],
    } as never);
    const res = await POST(makeRequest({ gameId: GAME_ID, finalScore: 100 }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorised");
  });

  it("should return 401 when cookie value does not match", async () => {
    vi.mocked(prisma.gameSession.findUnique).mockResolvedValue({
      id: GAME_ID,
      playerId: null,
      mode: "easy",
      endedAt: null,
      sessionToken: TOKEN,
      rounds: [],
    } as never);
    const res = await POST(
      makeRequest({ gameId: GAME_ID, finalScore: 100 }, `st_${GAME_ID}=wrong-token`)
    );
    expect(res.status).toBe(401);
  });

  it("should return 409 when session is already ended", async () => {
    vi.mocked(prisma.gameSession.findUnique).mockResolvedValue({
      id: GAME_ID,
      playerId: null,
      mode: "easy",
      endedAt: new Date(),
      sessionToken: TOKEN,
      rounds: [],
    } as never);
    const res = await POST(
      makeRequest({ gameId: GAME_ID, finalScore: 100 }, `st_${GAME_ID}=${TOKEN}`)
    );
    expect(res.status).toBe(409);
  });

  it("should return 200 with valid cookie and open session", async () => {
    vi.mocked(prisma.gameSession.findUnique).mockResolvedValue({
      id: GAME_ID,
      playerId: null,
      mode: "easy",
      endedAt: null,
      sessionToken: TOKEN,
      rounds: [],
    } as never);
    vi.mocked(prisma.gameSession.update).mockResolvedValue({
      endedAt: new Date("2026-04-09T12:00:00Z"),
    } as never);
    const res = await POST(
      makeRequest({ gameId: GAME_ID, finalScore: 500 }, `st_${GAME_ID}=${TOKEN}`)
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.gameId).toBe(GAME_ID);
    expect(data.finalScore).toBe(500);
  });
});
