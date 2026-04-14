import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/guess/route";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    round: {
      findUnique: vi.fn(),
    },
    imageStats: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    guess: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

const { prisma } = await import("@/app/lib/prisma");

const GAME_ID = "game-abc123";
const ROUND_ID = "round-xyz";
const TOKEN = "secret-token";

function makeRequest(body: object, cookie?: string) {
  return new NextRequest("http://localhost/api/guess", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

function mockRound(overrides: object = {}) {
  vi.mocked(prisma.round.findUnique).mockResolvedValue({
    id: ROUND_ID,
    gameId: GAME_ID,
    guess: null,
    timeLimitMs: null,
    session: {
      mode: "standard",
      sessionToken: TOKEN,
    },
    image: {
      id: "img-1",
      vehicleId: "vehicle-1",
      vehicle: {
        make: "Toyota",
        model: "Supra",
        year: 1993,
        aliases: [],
      },
    },
    ...overrides,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/guess", () => {
  it("should return 400 when roundId is missing", async () => {
    const res = await POST(makeRequest({ rawInput: "Toyota Supra" }));
    expect(res.status).toBe(400);
  });

  it("should return 404 when round not found", async () => {
    vi.mocked(prisma.round.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest({ roundId: ROUND_ID, rawInput: "Toyota Supra" }));
    expect(res.status).toBe(404);
  });

  it("should return 409 when round already has a guess", async () => {
    mockRound({ guess: { id: "existing-guess" } });
    const res = await POST(makeRequest({ roundId: ROUND_ID, rawInput: "Toyota Supra" }));
    expect(res.status).toBe(409);
  });

  it("should return 401 when cookie is missing", async () => {
    mockRound();
    const res = await POST(makeRequest({ roundId: ROUND_ID, rawInput: "Toyota Supra" }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorised");
  });

  it("should return 401 when cookie value does not match", async () => {
    mockRound();
    const res = await POST(
      makeRequest(
        { roundId: ROUND_ID, rawInput: "Toyota Supra" },
        `st_${GAME_ID}=wrong-token`
      )
    );
    expect(res.status).toBe(401);
  });

  it("should proceed past auth with a valid cookie", async () => {
    mockRound();
    vi.mocked(prisma.imageStats.findUnique).mockResolvedValue(null);
    const guessRecord = { id: "guess-1" };
    vi.mocked(prisma.$transaction).mockResolvedValue([guessRecord, {}] as never);

    const res = await POST(
      makeRequest(
        { roundId: ROUND_ID, rawInput: "Toyota Supra", guessedMake: "Toyota", guessedModel: "Supra" },
        `st_${GAME_ID}=${TOKEN}`
      )
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.guessId).toBe("guess-1");
  });
});
