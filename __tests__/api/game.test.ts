import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/game/route";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    imageStats: {
      findMany: vi.fn(),
    },
    image: {
      findMany: vi.fn(),
    },
    player: {
      upsert: vi.fn(),
    },
    gameSession: {
      create: vi.fn(),
    },
    round: {
      create: vi.fn(),
    },
    vehicle: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/app/lib/game", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/lib/game")>();
  return {
    ...actual,
    imageUrl: vi.fn((filename: string) => `https://cdn.example.com/${filename}`),
  };
});

const { prisma } = await import("@/app/lib/prisma");

const GAME_ID = "game-abc123";

const FAKE_IMAGE = {
  id: "img-1",
  filename: "car.jpg",
  vehicleId: "v-1",
  vehicle: { id: "v-1", make: "Toyota", model: "Supra", year: 1993, era: "modern" },
};

const FAKE_ROUND = { id: "round-1", gameId: GAME_ID };

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/game");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

beforeEach(() => {
  vi.clearAllMocks();

  // Provide enough images to pass the minimum-4 check
  vi.mocked(prisma.image.findMany).mockResolvedValue(
    Array.from({ length: 10 }, (_, i) => ({ ...FAKE_IMAGE, id: `img-${i}` })) as never
  );

  vi.mocked(prisma.gameSession.create).mockResolvedValue({
    id: GAME_ID,
    sessionToken: "tok-xyz",
  } as never);

  vi.mocked(prisma.$transaction).mockResolvedValue(
    Array.from({ length: 10 }, (_, i) => ({ ...FAKE_ROUND, id: `round-${i}` })) as never
  );

  // makes list for medium mode
  vi.mocked(prisma.vehicle.findMany).mockResolvedValue([
    { make: "Toyota" },
  ] as never);
});

describe("GET /api/game", () => {
  it("should return 400 for an invalid mode", async () => {
    const res = await GET(makeRequest({ mode: "invalid" }));
    expect(res.status).toBe(400);
  });

  it("should return gameId (not sessionId) in the response body", async () => {
    const res = await GET(makeRequest({ mode: "medium" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.gameId).toBe(GAME_ID);
    expect(data.sessionId).toBeUndefined();
  });

  it("should set an HttpOnly session cookie named for the gameId", async () => {
    const res = await GET(makeRequest({ mode: "medium" }));
    const setCookie = res.headers.get("Set-Cookie") ?? "";
    // Cookie name must match st_<gameId>; value is a UUID generated at request time
    expect(setCookie).toMatch(new RegExp(`^st_${GAME_ID}=[0-9a-f-]+`));
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Strict");
  });
});
