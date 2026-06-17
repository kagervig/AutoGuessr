// Tests for GET /api/daily-challenge/[date]/summary
import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/app/lib/daily-challenge", () => ({
  getChallengeByDate: vi.fn(),
}));

vi.mock("@/app/lib/game", () => ({
  vehicleLabel: (v: { make: string; model: string }) => `${v.make} ${v.model}`,
  imageUrl: (filename: string) => `https://img.test/${filename}`,
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    dailyChallengeSession: { findUnique: vi.fn() },
    image: { findMany: vi.fn() },
    vehicle: { findMany: vi.fn() },
  },
}));

import { GET } from "./route";
import { prisma } from "@/app/lib/prisma";
import { getChallengeByDate } from "@/app/lib/daily-challenge";

const CHALLENGE = { id: 1, imageIds: ["img-1", "img-2"], isPublished: true, date: new Date("2026-01-15") };

const SESSION = {
  totalScore: 5000,
  roundScores: [2500, 2500],
  answerVehicleIds: ["v-1", "v-2"],
  guessVehicleIds: ["v-1", "v-wrong"],
  roundBonuses: [
    { isHardcore: true, isCotd: false, isRareFind: false },
    { isHardcore: false, isCotd: false, isRareFind: false },
  ],
};

const IMAGES = [
  { id: "img-1", filename: "cars/car1", vehicleId: "v-1", transformationSignature: null, cropMethod: "standard" as const },
  { id: "img-2", filename: "cars/car2", vehicleId: "v-2", transformationSignature: null, cropMethod: "standard" as const },
];

const VEHICLES = [
  { id: "v-1", make: "Toyota", model: "Supra" },
  { id: "v-2", make: "Nissan", model: "GT-R" },
  { id: "v-wrong", make: "Honda", model: "NSX" },
];

function makeRequest(date: string, queryParams?: Record<string, string>) {
  const url = new URL(`http://localhost/api/daily-challenge/${date}/summary`);
  if (queryParams) {
    for (const [k, v] of Object.entries(queryParams)) url.searchParams.set(k, v);
  }
  return [
    new NextRequest(url),
    { params: Promise.resolve({ date }) },
  ] as const;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getChallengeByDate).mockResolvedValue(CHALLENGE as never);
  vi.mocked(prisma.dailyChallengeSession.findUnique).mockResolvedValue(SESSION as never);
  vi.mocked(prisma.image.findMany).mockResolvedValue(IMAGES as never);
  vi.mocked(prisma.vehicle.findMany).mockResolvedValue(VEHICLES as never);
});

describe("GET /api/daily-challenge/[date]/summary", () => {
  it("returns 400 for an invalid date format", async () => {
    const [req, ctx] = makeRequest("not-a-date", { playerId: "p-1" });
    const res = await GET(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when playerId is missing", async () => {
    const [req, ctx] = makeRequest("2026-01-15");
    const res = await GET(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when challenge is not found", async () => {
    vi.mocked(getChallengeByDate).mockResolvedValue(null);
    const [req, ctx] = makeRequest("2026-01-15", { playerId: "p-1" });
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 404 when no completed session exists for this player+date", async () => {
    vi.mocked(prisma.dailyChallengeSession.findUnique).mockResolvedValue(null);
    const [req, ctx] = makeRequest("2026-01-15", { playerId: "p-1" });
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns totalScore and one entry per round", async () => {
    const [req, ctx] = makeRequest("2026-01-15", { playerId: "p-1" });
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalScore).toBe(5000);
    expect(body.rounds).toHaveLength(2);
  });

  it("round includes imageUrl, correctVehicleLabel, guessedVehicleLabel, roundScore", async () => {
    const [req, ctx] = makeRequest("2026-01-15", { playerId: "p-1" });
    const res = await GET(req, ctx);
    const { rounds } = await res.json();
    expect(rounds[0].imageUrl).toContain("car1");
    expect(rounds[0].correctVehicleLabel).toBe("Toyota Supra");
    expect(rounds[0].guessedVehicleLabel).toBe("Toyota Supra");
    expect(rounds[0].roundScore).toBe(2500);
  });

  it("includes earned bonuses on a correct guess", async () => {
    const [req, ctx] = makeRequest("2026-01-15", { playerId: "p-1" });
    const res = await GET(req, ctx);
    const { rounds } = await res.json();
    expect(rounds[0].bonuses).toContainEqual({ type: "hardcore", points: 1000 });
  });

  it("shows no bonuses on an incorrect guess", async () => {
    const [req, ctx] = makeRequest("2026-01-15", { playerId: "p-1" });
    const res = await GET(req, ctx);
    const { rounds } = await res.json();
    expect(rounds[1].bonuses).toHaveLength(0);
  });

  it("returns null guessedVehicleLabel for legacy sessions with empty guessVehicleIds", async () => {
    vi.mocked(prisma.dailyChallengeSession.findUnique).mockResolvedValue({
      ...SESSION,
      guessVehicleIds: [],
    } as never);
    const [req, ctx] = makeRequest("2026-01-15", { playerId: "p-1" });
    const res = await GET(req, ctx);
    const { rounds } = await res.json();
    expect(rounds[0].guessedVehicleLabel).toBeNull();
    expect(rounds[1].guessedVehicleLabel).toBeNull();
  });
});
