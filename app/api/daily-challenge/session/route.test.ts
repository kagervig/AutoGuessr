// Tests for GET /api/daily-challenge/session
import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/app/lib/daily-challenge", () => ({
  getOrCreateTodaysChallenge: vi.fn(),
  getChallengeByDate: vi.fn(),
}));

vi.mock("@/app/lib/car-of-the-day", () => ({
  getOrCreateTodaysFeatured: vi.fn(),
}));

vi.mock("@/app/lib/game", () => ({
  imageUrl: (filename: string) => `https://img.test/${filename}`,
  vehicleLabel: (v: { make: string; model: string }) => `${v.make} ${v.model}`,
  selectDistractors: vi.fn(),
  shuffle: <T>(arr: T[]) => arr,
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    player: { findUnique: vi.fn() },
    dailyChallengeSession: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    image: { findMany: vi.fn() },
    vehicle: { findMany: vi.fn() },
  },
}));

import { GET } from "./route";
import { prisma } from "@/app/lib/prisma";

import { getChallengeByDate, getOrCreateTodaysChallenge } from "@/app/lib/daily-challenge";
import { getOrCreateTodaysFeatured } from "@/app/lib/car-of-the-day";
import { selectDistractors } from "@/app/lib/game";

const CHALLENGE = {
  id: 1,
  date: new Date("2025-01-01"),
  imageIds: ["img-1"],
  isPublished: true,
  curatedBy: null,
  generatedAt: new Date("2024-12-31"),
};

const IMAGE_1 = {
  id: "img-1",
  filename: "cars/supra",
  vehicleId: "v-1",
  isHardcoreEligible: false,
  transformationSignature: null,
  cropMethod: "standard",
  vehicle: {
    id: "v-1",
    make: "Toyota",
    model: "Supra",
    year: 1994,
    era: "retro",
    rarity: "common",
    categories: [],
  },
};

const VEHICLE_POOL = [
  { id: "v-1", make: "Toyota", model: "Supra", era: "retro", categories: [] },
  { id: "v-2", make: "Nissan", model: "GT-R", era: "modern", categories: [] },
  { id: "v-3", make: "Honda", model: "NSX", era: "retro", categories: [] },
  { id: "v-4", make: "Mazda", model: "RX-7", era: "modern", categories: [] },
];

const DISTRACTORS = [
  { id: "v-2", make: "Nissan", model: "GT-R", era: "modern", categorySlugs: [] },
  { id: "v-3", make: "Honda", model: "NSX", era: "retro", categorySlugs: [] },
  { id: "v-4", make: "Mazda", model: "RX-7", era: "modern", categorySlugs: [] },
];

function makeRequest(params?: Record<string, string>, cookies?: Record<string, string>) {
  const url = new URL("http://localhost/api/daily-challenge/session");
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const headers: Record<string, string> = {};
  if (cookies) {
    headers["Cookie"] = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
  }
  return new NextRequest(url, { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getChallengeByDate).mockResolvedValue(CHALLENGE as never);
  vi.mocked(getOrCreateTodaysChallenge).mockResolvedValue(CHALLENGE as never);
  vi.mocked(getOrCreateTodaysFeatured).mockResolvedValue({ vehicleId: "v-cotd" } as never);
  vi.mocked(prisma.player.findUnique).mockResolvedValue({ id: "player-1" } as never);
  vi.mocked(prisma.dailyChallengeSession.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.dailyChallengeSession.create).mockResolvedValue({ id: "session-uuid" } as never);
  vi.mocked(prisma.image.findMany).mockResolvedValue([IMAGE_1] as never);
  vi.mocked(prisma.vehicle.findMany).mockResolvedValue(VEHICLE_POOL as never);
  vi.mocked(selectDistractors).mockReturnValue(DISTRACTORS as never);
});

describe("GET /api/daily-challenge/session", () => {
  it("returns 403 for a future date", async () => {
    const res = await GET(makeRequest({ date: "2099-01-01" }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/not yet available/i);
  });

  it("returns 404 when challenge not found for date", async () => {
    vi.mocked(getChallengeByDate).mockResolvedValue(null);
    const res = await GET(makeRequest({ date: "2025-01-01" }));
    expect(res.status).toBe(404);
  });

  it("returns 403 when player already has a session for this challenge", async () => {
    vi.mocked(prisma.dailyChallengeSession.findUnique).mockResolvedValue({ id: "existing-session" } as never);
    const res = await GET(makeRequest({ date: "2025-01-01", playerId: "player-1" }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.existingSessionId).toBe("existing-session");
  });

  it("returns sessionId and rounds for a valid request", async () => {
    const res = await GET(makeRequest({ date: "2025-01-01" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionId).toBeDefined();
    expect(body.rounds).toHaveLength(1);
  });

  it("each round includes roundIndex, imageUrl, distractors, and bonusFlags", async () => {
    const res = await GET(makeRequest({ date: "2025-01-01" }));
    const { rounds } = await res.json();
    const round = rounds[0];
    expect(round.roundIndex).toBe(0);
    expect(round.imageUrl).toContain("cars/supra");
    expect(round.distractors).toHaveLength(4);
    expect(round.bonusFlags).toBeDefined();
  });

  it("bonusFlags default to false when no special conditions apply", async () => {
    const res = await GET(makeRequest({ date: "2025-01-01" }));
    const { rounds } = await res.json();
    expect(rounds[0].bonusFlags).toEqual({ isHardcore: false, isCotd: false, isRareFind: false });
  });

  it("sets isHardcore when image is hardcore eligible", async () => {
    vi.mocked(prisma.image.findMany).mockResolvedValue([{ ...IMAGE_1, isHardcoreEligible: true }] as never);
    const res = await GET(makeRequest({ date: "2025-01-01" }));
    const { rounds } = await res.json();
    expect(rounds[0].bonusFlags.isHardcore).toBe(true);
  });

  it("sets isCotd when vehicle matches car of the day", async () => {
    vi.mocked(getOrCreateTodaysFeatured).mockResolvedValue({ vehicleId: "v-1" } as never);
    const res = await GET(makeRequest({ date: "2025-01-01" }));
    const { rounds } = await res.json();
    expect(rounds[0].bonusFlags.isCotd).toBe(true);
  });

  it("sets isRareFind for rare rarity", async () => {
    vi.mocked(prisma.image.findMany).mockResolvedValue([
      { ...IMAGE_1, vehicle: { ...IMAGE_1.vehicle, rarity: "rare" } },
    ] as never);
    const res = await GET(makeRequest({ date: "2025-01-01" }));
    const { rounds } = await res.json();
    expect(rounds[0].bonusFlags.isRareFind).toBe(true);
  });

  it("sets isRareFind for ultra_rare rarity", async () => {
    vi.mocked(prisma.image.findMany).mockResolvedValue([
      { ...IMAGE_1, vehicle: { ...IMAGE_1.vehicle, rarity: "ultra_rare" } },
    ] as never);
    const res = await GET(makeRequest({ date: "2025-01-01" }));
    const { rounds } = await res.json();
    expect(rounds[0].bonusFlags.isRareFind).toBe(true);
  });

  it("includes the correct vehicle among the distractor choices", async () => {
    const res = await GET(makeRequest({ date: "2025-01-01" }));
    const { rounds } = await res.json();
    const vehicleIds = rounds[0].distractors.map((d: { vehicleId: string }) => d.vehicleId);
    expect(vehicleIds).toContain("v-1");
  });

  it("creates a session row with correct answer vehicle IDs", async () => {
    await GET(makeRequest({ date: "2025-01-01", playerId: "player-1" }));
    expect(vi.mocked(prisma.dailyChallengeSession.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          playerId: "player-1",
          challengeId: CHALLENGE.id,
          answerVehicleIds: ["v-1"],
        }),
      })
    );
  });

  it("skips DB play-once check when no playerId is provided", async () => {
    await GET(makeRequest({ date: "2025-01-01" }));
    expect(vi.mocked(prisma.dailyChallengeSession.findUnique)).not.toHaveBeenCalled();
  });

  it("returns 403 when the played cookie is set for this challenge", async () => {
    const res = await GET(makeRequest(
      { date: "2025-01-01" },
      { [`dc_played_${CHALLENGE.id}`]: "existing-session-id" },
    ));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.existingSessionId).toBe("existing-session-id");
  });

  it("sets the played cookie on successful session creation", async () => {
    const res = await GET(makeRequest({ date: "2025-01-01" }));
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("Set-Cookie");
    expect(setCookie).toContain(`dc_played_${CHALLENGE.id}=`);
    expect(setCookie).toContain("HttpOnly");
  });

  it("isCotd is false when COTD lookup fails", async () => {
    vi.mocked(getOrCreateTodaysFeatured).mockRejectedValue(new Error("no cotd"));
    const res = await GET(makeRequest({ date: "2025-01-01" }));
    expect(res.status).toBe(200);
    const { rounds } = await res.json();
    expect(rounds[0].bonusFlags.isCotd).toBe(false);
  });
});
