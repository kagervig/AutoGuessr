import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/session/initials/route";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    gameSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const { prisma } = await import("@/app/lib/prisma");

const GAME_ID = "game-abc123";
const TOKEN = "secret-token";

function makeRequest(body: object, cookie?: string) {
  return new NextRequest("http://localhost/api/session/initials", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

function mockSession(overrides: object = {}) {
  vi.mocked(prisma.gameSession.findUnique).mockResolvedValue({
    id: GAME_ID,
    endedAt: new Date(),
    initials: null,
    mode: "standard",
    sessionToken: TOKEN,
    ...overrides,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PATCH /api/session/initials", () => {
  it("should return 400 when gameId is missing", async () => {
    const res = await PATCH(makeRequest({ initials: "ABC" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("gameId is required");
  });

  it("should return 400 when initials are invalid", async () => {
    const res = await PATCH(makeRequest({ gameId: GAME_ID, initials: "123" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/initials/i);
  });

  it("should return 404 when session not found", async () => {
    vi.mocked(prisma.gameSession.findUnique).mockResolvedValue(null);
    const res = await PATCH(makeRequest({ gameId: GAME_ID, initials: "ABC" }));
    expect(res.status).toBe(404);
  });

  it("should return 409 when session has not ended", async () => {
    mockSession({ endedAt: null });
    const res = await PATCH(makeRequest({ gameId: GAME_ID, initials: "ABC" }));
    expect(res.status).toBe(409);
  });

  it("should return 409 when initials already set", async () => {
    mockSession({ initials: "XYZ" });
    const res = await PATCH(makeRequest({ gameId: GAME_ID, initials: "ABC" }));
    expect(res.status).toBe(409);
  });

  it("should return 400 for practice sessions", async () => {
    mockSession({ mode: "practice" });
    const res = await PATCH(
      makeRequest({ gameId: GAME_ID, initials: "ABC" }, `st_${GAME_ID}=${TOKEN}`)
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/practice/i);
  });

  it("should return 401 when cookie is missing", async () => {
    mockSession();
    const res = await PATCH(makeRequest({ gameId: GAME_ID, initials: "ABC" }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorised");
  });

  it("should return 401 when cookie value does not match", async () => {
    mockSession();
    const res = await PATCH(
      makeRequest({ gameId: GAME_ID, initials: "ABC" }, `st_${GAME_ID}=wrong-token`)
    );
    expect(res.status).toBe(401);
  });

  it("should return 200 with valid cookie and eligible session", async () => {
    mockSession();
    vi.mocked(prisma.gameSession.update).mockResolvedValue({} as never);
    const res = await PATCH(
      makeRequest({ gameId: GAME_ID, initials: "ABC" }, `st_${GAME_ID}=${TOKEN}`)
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
