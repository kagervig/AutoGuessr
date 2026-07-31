// Tests for the survival mode branch of GET /api/game
import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/app/lib/feature-flags-server", () => ({
  isFeatureEnabled: vi.fn(),
}));

vi.mock("@/app/lib/image-selection", () => ({
  selectTieredImages: vi.fn(),
  selectSurvivalImage: vi.fn(),
}));

vi.mock("@/app/lib/car-of-the-day", () => ({
  getOrCreateTodaysFeatured: vi.fn(),
}));

vi.mock("@/app/lib/daily-challenge", () => ({
  getOrCreateTodaysChallenge: vi.fn(),
  getChallengeByDate: vi.fn(),
}));

vi.mock("@/app/lib/game", () => ({
  imageUrl: (filename: string) => `https://img.test/${filename}`,
  vehicleLabel: (v: { make: string; model: string }) => `${v.make} ${v.model}`,
  selectDistractors: vi.fn(),
  shuffle: <T>(arr: T[]) => arr,
  proLevelBonus: vi.fn().mockReturnValue(0),
  TIME_LIMITS: { time_attack: 30000 },
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    player: { findUnique: vi.fn() },
    gameSession: { create: vi.fn() },
    vehicle: { findMany: vi.fn() },
    imageStats: { findMany: vi.fn() },
    round: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { GET } from "./route";
import { prisma } from "@/app/lib/prisma";
import { selectSurvivalImage } from "@/app/lib/image-selection";
import { selectDistractors } from "@/app/lib/game";
import { isFeatureEnabled } from "@/app/lib/feature-flags-server";
import { getOrCreateTodaysFeatured } from "@/app/lib/car-of-the-day";

const IMG_1 = {
  id: "img-1",
  filename: "cars/supra",
  vehicleId: "v-1",
  isCropped: false,
  isLogoVisible: true,
  isModelNameVisible: false,
  isHardcoreEligible: false,
  vehicle: { id: "v-1", make: "Toyota", model: "Supra", year: 1994, era: "retro", rarity: "common" },
  stats: null,
  totalServes: 0,
  correctRatio: 1.0,
  selectionWeight: 1.0,
};

const IMG_2 = {
  id: "img-2",
  filename: "cars/gtr",
  vehicleId: "v-2",
  isCropped: false,
  isLogoVisible: false,
  isModelNameVisible: false,
  isHardcoreEligible: false,
  vehicle: { id: "v-2", make: "Nissan", model: "GT-R", year: 2009, era: "modern", rarity: "uncommon" },
  stats: null,
  totalServes: 0,
  correctRatio: 1.0,
  selectionWeight: 1.0,
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

const SESSION = { id: "session-uuid", sessionToken: "token-abc" };
const ROUNDS = [{ id: "round-1" }, { id: "round-2" }];

function makeRequest(params?: Record<string, string>) {
  const url = new URL("http://localhost/api/game");
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isFeatureEnabled).mockResolvedValue(true);
  vi.mocked(selectSurvivalImage)
    .mockResolvedValueOnce(IMG_1 as never)
    .mockResolvedValueOnce(IMG_2 as never);
  vi.mocked(selectDistractors).mockReturnValue(DISTRACTORS as never);
  vi.mocked(getOrCreateTodaysFeatured).mockResolvedValue({ vehicleId: "v-cotd" } as never);
  vi.mocked(prisma.player.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.gameSession.create).mockResolvedValue(SESSION as never);
  vi.mocked(prisma.vehicle.findMany).mockResolvedValue(VEHICLE_POOL as never);
  vi.mocked(prisma.imageStats.findMany).mockResolvedValue([]);
  vi.mocked(prisma.round.create).mockResolvedValue({ id: "round-stub" } as never);
  vi.mocked(prisma.$transaction).mockResolvedValue(ROUNDS as never);
});

describe("GET /api/game (survival)", () => {
  it("returns 403 when survival feature flag is disabled", async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false);
    const res = await GET(makeRequest({ mode: "survival" }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/not available/i);
  });

  it("returns 200 with 2 rounds for a valid survival request", async () => {
    const res = await GET(makeRequest({ mode: "survival" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.gameId).toBe("session-uuid");
    expect(body.rounds).toHaveLength(2);
  });

  it("returns easyChoices for both initial rounds", async () => {
    const res = await GET(makeRequest({ mode: "survival" }));
    const body = await res.json();
    expect(body.easyChoices).toBeDefined();
    expect(Object.keys(body.easyChoices)).toHaveLength(2);
  });

  it("sets session cookie on success", async () => {
    const res = await GET(makeRequest({ mode: "survival" }));
    expect(res.status).toBe(200);
    const cookie = res.headers.get("Set-Cookie");
    expect(cookie).toContain("st_session-uuid=");
    expect(cookie).toContain("HttpOnly");
  });

  it("selects round 2 with round 1 vehicle excluded", async () => {
    await GET(makeRequest({ mode: "survival" }));
    const calls = vi.mocked(selectSurvivalImage).mock.calls;
    expect(calls[0]).toEqual([1, []]);
    expect(calls[1]).toEqual([2, ["v-1"]]);
  });

  it("does not include makes in the response", async () => {
    const res = await GET(makeRequest({ mode: "survival" }));
    const body = await res.json();
    expect(body.makes).toBeUndefined();
  });

  it("includes correct vehicle among each round's choices", async () => {
    const res = await GET(makeRequest({ mode: "survival" }));
    const body = await res.json();
    const allChoices = Object.values(body.easyChoices as Record<string, { vehicleId: string }[]>).flat();
    const vehicleIds = allChoices.map((c) => c.vehicleId);
    expect(vehicleIds).toContain("v-1");
    expect(vehicleIds).toContain("v-2");
  });
});
