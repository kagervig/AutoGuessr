// Tests for POST /api/daily-challenge/guess
import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/server", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next/server")>();
  return { ...mod, after: vi.fn() };
});

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    dailyChallengeSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    imageStats: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/app/lib/game", () => ({
  scoreRound: vi.fn(),
  TIME_LIMITS: { daily: 30_000 },
}));

import { POST } from "./route";
import { prisma } from "@/app/lib/prisma";
import { scoreRound } from "@/app/lib/game";

const SCORING = {
  makePoints: 300,
  modelPoints: 400,
  yearBonus: null,
  timeBonus: 0,
  modeMultiplier: 1.7,
  dailyDiscoveryBonus: 0,
  pointsEarned: 1190,
};

const NO_BONUSES = { isHardcore: false, isCotd: false, isRareFind: false };

const SESSION = {
  answerVehicleIds: Array.from({ length: 10 }, (_, i) => `v-${i + 1}`),
  roundBonuses: Array.from({ length: 10 }, () => ({ ...NO_BONUSES })),
  roundScores: [] as number[],
  guessVehicleIds: [] as string[],
  completedAt: null,
  challengeId: 1,
  challenge: { imageIds: Array.from({ length: 10 }, (_, i) => `img-${i + 1}`) },
};

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/daily-challenge/guess", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.dailyChallengeSession.findUnique).mockResolvedValue(SESSION as never);
  vi.mocked(prisma.dailyChallengeSession.update).mockResolvedValue({} as never);
  vi.mocked(prisma.dailyChallengeSession.count).mockResolvedValue(0);
  vi.mocked(scoreRound).mockReturnValue(SCORING as never);
});

describe("POST /api/daily-challenge/guess", () => {
  it("returns 400 when sessionId is missing", async () => {
    const res = await POST(makeRequest({ roundIndex: 0, vehicleId: "v-1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when roundIndex is missing", async () => {
    const res = await POST(makeRequest({ sessionId: "s-1", vehicleId: "v-1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when vehicleId is missing", async () => {
    const res = await POST(makeRequest({ sessionId: "s-1", roundIndex: 0 }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when session not found", async () => {
    vi.mocked(prisma.dailyChallengeSession.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest({ sessionId: "s-1", roundIndex: 0, vehicleId: "v-1" }));
    expect(res.status).toBe(404);
  });

  it("returns 409 when session already completed", async () => {
    vi.mocked(prisma.dailyChallengeSession.findUnique).mockResolvedValue({
      ...SESSION,
      completedAt: new Date(),
    } as never);
    const res = await POST(makeRequest({ sessionId: "s-1", roundIndex: 0, vehicleId: "v-1" }));
    expect(res.status).toBe(409);
  });

  it("returns 400 when roundIndex is out of range", async () => {
    const res = await POST(makeRequest({ sessionId: "s-1", roundIndex: 10, vehicleId: "v-1" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 when round already guessed", async () => {
    vi.mocked(prisma.dailyChallengeSession.findUnique).mockResolvedValue({
      ...SESSION,
      roundScores: [1190],
    } as never);
    const res = await POST(makeRequest({ sessionId: "s-1", roundIndex: 0, vehicleId: "v-1" }));
    expect(res.status).toBe(409);
  });

  it("returns 400 when rounds guessed out of order", async () => {
    const res = await POST(makeRequest({ sessionId: "s-1", roundIndex: 2, vehicleId: "v-3" }));
    expect(res.status).toBe(400);
  });

  it("returns correct=true and correctVehicleId on a correct guess", async () => {
    const res = await POST(makeRequest({ sessionId: "s-1", roundIndex: 0, vehicleId: "v-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.correct).toBe(true);
    expect(body.correctVehicleId).toBe("v-1");
  });

  it("returns correct=false on an incorrect guess", async () => {
    const res = await POST(makeRequest({ sessionId: "s-1", roundIndex: 0, vehicleId: "v-wrong" }));
    const body = await res.json();
    expect(body.correct).toBe(false);
    expect(body.correctVehicleId).toBe("v-1");
  });

  it("returns no bonuses on an incorrect guess even when flags are set", async () => {
    vi.mocked(prisma.dailyChallengeSession.findUnique).mockResolvedValue({
      ...SESSION,
      roundBonuses: [{ isHardcore: true, isCotd: true, isRareFind: true }, ...SESSION.roundBonuses.slice(1)],
    } as never);
    const res = await POST(makeRequest({ sessionId: "s-1", roundIndex: 0, vehicleId: "v-wrong" }));
    const body = await res.json();
    expect(body.bonusesEarned).toEqual([]);
  });

  it("includes hardcore bonus on correct guess with isHardcore flag", async () => {
    vi.mocked(prisma.dailyChallengeSession.findUnique).mockResolvedValue({
      ...SESSION,
      roundBonuses: [{ isHardcore: true, isCotd: false, isRareFind: false }, ...SESSION.roundBonuses.slice(1)],
    } as never);
    const res = await POST(makeRequest({ sessionId: "s-1", roundIndex: 0, vehicleId: "v-1" }));
    const body = await res.json();
    expect(body.bonusesEarned).toContainEqual({ type: "hardcore", points: 1000 });
    expect(body.score).toBe(SCORING.pointsEarned + 1000);
  });

  it("includes cotd bonus on correct guess with isCotd flag", async () => {
    vi.mocked(prisma.dailyChallengeSession.findUnique).mockResolvedValue({
      ...SESSION,
      roundBonuses: [{ isHardcore: false, isCotd: true, isRareFind: false }, ...SESSION.roundBonuses.slice(1)],
    } as never);
    const res = await POST(makeRequest({ sessionId: "s-1", roundIndex: 0, vehicleId: "v-1" }));
    const body = await res.json();
    expect(body.bonusesEarned).toContainEqual({ type: "cotd", points: 1000 });
    expect(body.score).toBe(SCORING.pointsEarned + 1000);
  });

  it("includes rareFind bonus on correct guess with isRareFind flag", async () => {
    vi.mocked(prisma.dailyChallengeSession.findUnique).mockResolvedValue({
      ...SESSION,
      roundBonuses: [{ isHardcore: false, isCotd: false, isRareFind: true }, ...SESSION.roundBonuses.slice(1)],
    } as never);
    const res = await POST(makeRequest({ sessionId: "s-1", roundIndex: 0, vehicleId: "v-1" }));
    const body = await res.json();
    expect(body.bonusesEarned).toContainEqual({ type: "rareFind", points: 1000 });
    expect(body.score).toBe(SCORING.pointsEarned + 1000);
  });

  it("stacks multiple bonuses", async () => {
    vi.mocked(prisma.dailyChallengeSession.findUnique).mockResolvedValue({
      ...SESSION,
      roundBonuses: [{ isHardcore: true, isCotd: true, isRareFind: true }, ...SESSION.roundBonuses.slice(1)],
    } as never);
    const res = await POST(makeRequest({ sessionId: "s-1", roundIndex: 0, vehicleId: "v-1" }));
    const body = await res.json();
    expect(body.bonusesEarned).toHaveLength(3);
    expect(body.score).toBe(SCORING.pointsEarned + 3000);
  });

  it("non-final round returns isFinal=false with no totalScore or rank", async () => {
    const res = await POST(makeRequest({ sessionId: "s-1", roundIndex: 0, vehicleId: "v-1" }));
    const body = await res.json();
    expect(body.isFinal).toBe(false);
    expect(body.totalScore).toBeUndefined();
    expect(body.rank).toBeUndefined();
  });

  it("final round returns isFinal=true with totalScore, rank, totalPlayers, percentile", async () => {
    const existingScores = Array.from({ length: 9 }, () => 1000);
    vi.mocked(prisma.dailyChallengeSession.findUnique).mockResolvedValue({
      ...SESSION,
      roundScores: existingScores,
    } as never);
    // 2 players scored higher, 10 total completed
    vi.mocked(prisma.dailyChallengeSession.count)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(10);

    const res = await POST(makeRequest({ sessionId: "s-1", roundIndex: 9, vehicleId: "v-10" }));
    const body = await res.json();
    expect(body.isFinal).toBe(true);
    expect(body.totalScore).toBe(9000 + SCORING.pointsEarned);
    expect(body.rank).toBe(3);
    expect(body.totalPlayers).toBe(10);
    expect(body.percentile).toBe(70);
  });

  it("updates session roundScores after a guess", async () => {
    await POST(makeRequest({ sessionId: "s-1", roundIndex: 0, vehicleId: "v-1" }));
    expect(vi.mocked(prisma.dailyChallengeSession.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ roundScores: [SCORING.pointsEarned] }),
      })
    );
  });

  it("sets completedAt and totalScore on final round update", async () => {
    const existingScores = Array.from({ length: 9 }, () => 1000);
    vi.mocked(prisma.dailyChallengeSession.findUnique).mockResolvedValue({
      ...SESSION,
      roundScores: existingScores,
    } as never);

    await POST(makeRequest({ sessionId: "s-1", roundIndex: 9, vehicleId: "v-10" }));
    expect(vi.mocked(prisma.dailyChallengeSession.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          completedAt: expect.any(Date),
          totalScore: 9000 + SCORING.pointsEarned,
        }),
      })
    );
  });

  it("writes the guessed vehicleId to guessVehicleIds on update", async () => {
    await POST(makeRequest({ sessionId: "s-1", roundIndex: 0, vehicleId: "v-wrong" }));
    expect(vi.mocked(prisma.dailyChallengeSession.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ guessVehicleIds: ["v-wrong"] }),
      })
    );
  });

  it("appends to existing guessVehicleIds in a mid-session round", async () => {
    vi.mocked(prisma.dailyChallengeSession.findUnique).mockResolvedValue({
      ...SESSION,
      roundScores: [1190],
      guessVehicleIds: ["v-1"],
    } as never);
    await POST(makeRequest({ sessionId: "s-1", roundIndex: 1, vehicleId: "v-wrong" }));
    expect(vi.mocked(prisma.dailyChallengeSession.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ guessVehicleIds: ["v-1", "v-wrong"] }),
      })
    );
  });
});
