// Tests for GET /api/survival/next
import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/app/lib/feature-flags-server", () => ({
  isFeatureEnabled: vi.fn(),
}));

vi.mock("@/app/lib/image-selection", () => ({
  selectSurvivalImage: vi.fn(),
}));

vi.mock("@/app/lib/game", () => ({
  imageUrl: (filename: string) => `https://img.test/${filename}`,
  vehicleLabel: (v: { make: string; model: string }) => `${v.make} ${v.model}`,
  selectDistractors: vi.fn(),
  shuffle: <T>(arr: T[]) => arr,
  proLevelBonus: vi.fn().mockReturnValue(0),
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    gameSession: { findUnique: vi.fn() },
    round: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    vehicle: { findMany: vi.fn() },
    imageStats: { findFirst: vi.fn() },
  },
}));

import { GET } from "./route";
import { prisma } from "@/app/lib/prisma";
import { selectSurvivalImage } from "@/app/lib/image-selection";
import { selectDistractors } from "@/app/lib/game";
import { isFeatureEnabled } from "@/app/lib/feature-flags-server";

const GAME_ID = "game-uuid";
const SESSION_TOKEN = "token-abc";

const SESSION = {
  id: GAME_ID,
  sessionToken: SESSION_TOKEN,
  endedAt: null,
};

const IMG_3 = {
  id: "img-3",
  filename: "cars/rx7",
  vehicleId: "v-3",
  isCropped: false,
  isLogoVisible: true,
  isModelNameVisible: false,
  isHardcoreEligible: false,
  vehicle: { id: "v-3", make: "Mazda", model: "RX-7", year: 1993, era: "retro", rarity: "common" },
  stats: null,
  totalServes: 0,
  correctRatio: 1.0,
  selectionWeight: 1.0,
};

// Two prior rounds already played
const PRIOR_ROUNDS = [
  { id: "round-1", sequenceNumber: 1, image: { vehicleId: "v-1" } },
  { id: "round-2", sequenceNumber: 2, image: { vehicleId: "v-2" } },
];

const VEHICLE_POOL = [
  { id: "v-1", make: "Toyota", model: "Supra", era: "retro", categories: [] },
  { id: "v-2", make: "Nissan", model: "GT-R", era: "modern", categories: [] },
  { id: "v-3", make: "Mazda", model: "RX-7", era: "retro", categories: [] },
  { id: "v-4", make: "Honda", model: "NSX", era: "retro", categories: [] },
];

const DISTRACTORS = [
  { id: "v-1", make: "Toyota", model: "Supra", era: "retro", categorySlugs: [] },
  { id: "v-2", make: "Nissan", model: "GT-R", era: "modern", categorySlugs: [] },
  { id: "v-4", make: "Honda", model: "NSX", era: "retro", categorySlugs: [] },
];

const NEW_ROUND = { id: "round-3", sequenceNumber: 3 };

function makeRequest(params?: Record<string, string>, cookies?: Record<string, string>) {
  const url = new URL("http://localhost/api/survival/next");
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const headers: Record<string, string> = {};
  if (cookies) {
    headers["Cookie"] = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
  }
  return new NextRequest(url, { headers });
}

function validRequest() {
  return makeRequest({ gameId: GAME_ID }, { [`st_${GAME_ID}`]: SESSION_TOKEN });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isFeatureEnabled).mockResolvedValue(true);
  vi.mocked(prisma.gameSession.findUnique).mockResolvedValue(SESSION as never);
  vi.mocked(prisma.round.findMany).mockResolvedValue(PRIOR_ROUNDS as never);
  vi.mocked(selectSurvivalImage).mockResolvedValue(IMG_3 as never);
  vi.mocked(selectDistractors).mockReturnValue(DISTRACTORS as never);
  vi.mocked(prisma.vehicle.findMany).mockResolvedValue(VEHICLE_POOL as never);
  vi.mocked(prisma.imageStats.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.round.create).mockResolvedValue(NEW_ROUND as never);
});

describe("GET /api/survival/next", () => {
  it("returns 400 when gameId is missing", async () => {
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 401 when session cookie is absent", async () => {
    const res = await GET(makeRequest({ gameId: GAME_ID }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when feature flag is disabled", async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false);
    const res = await GET(validRequest());
    expect(res.status).toBe(403);
  });

  it("returns 404 when session is not found", async () => {
    vi.mocked(prisma.gameSession.findUnique).mockResolvedValue(null);
    const res = await GET(validRequest());
    expect(res.status).toBe(404);
  });

  it("returns 401 when cookie value does not match session token", async () => {
    const res = await GET(makeRequest({ gameId: GAME_ID }, { [`st_${GAME_ID}`]: "wrong-token" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when session has already ended", async () => {
    vi.mocked(prisma.gameSession.findUnique).mockResolvedValue({
      ...SESSION,
      endedAt: new Date(),
    } as never);
    const res = await GET(validRequest());
    expect(res.status).toBe(403);
  });

  it("returns 200 with next round data", async () => {
    const res = await GET(validRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.roundId).toBe("round-3");
    expect(body.sequenceNumber).toBe(3);
    expect(body.imageUrl).toContain("cars/rx7");
    expect(body.easyChoices).toBeDefined();
  });

  it("refreshes the session cookie on success", async () => {
    const res = await GET(validRequest());
    expect(res.status).toBe(200);
    const cookie = res.headers.get("Set-Cookie");
    expect(cookie).toContain(`st_${GAME_ID}=${SESSION_TOKEN}`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Max-Age=1200");
  });

  it("passes prior round vehicleIds to selectSurvivalImage", async () => {
    await GET(validRequest());
    const [seqArg, excludeArg] = vi.mocked(selectSurvivalImage).mock.calls[0];
    expect(seqArg).toBe(3);
    expect(excludeArg).toEqual(["v-1", "v-2"]);
  });

  it("easyChoices include the correct vehicle for the new round", async () => {
    const res = await GET(validRequest());
    const body = await res.json();
    const choices = body.easyChoices["round-3"] as { vehicleId: string }[];
    expect(choices.map((c) => c.vehicleId)).toContain("v-3");
  });

  it("creates the round with correct sequenceNumber", async () => {
    await GET(validRequest());
    expect(vi.mocked(prisma.round.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          gameId: GAME_ID,
          sequenceNumber: 3,
          imageId: "img-3",
        }),
      }),
    );
  });
});
