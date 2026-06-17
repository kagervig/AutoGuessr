// Tests for GET /api/daily-challenge/[date]/leaderboard
import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/app/lib/daily-challenge", () => ({
  getChallengeByDate: vi.fn(),
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: { $queryRaw: vi.fn() },
}));

import { GET } from "./route";
import { prisma } from "@/app/lib/prisma";
import { getChallengeByDate } from "@/app/lib/daily-challenge";

const CHALLENGE = { id: 1, isPublished: true, date: new Date("2026-01-15") };

const LEADERBOARD_ROWS = [
  { rank: BigInt(1), username: "alice", totalScore: 8000 },
  { rank: BigInt(2), username: "bob", totalScore: 6000 },
  { rank: BigInt(3), username: null, totalScore: 4000 },
];

function makeRequest(date: string) {
  return [
    new NextRequest(`http://localhost/api/daily-challenge/${date}/leaderboard`),
    { params: Promise.resolve({ date }) },
  ] as const;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getChallengeByDate).mockResolvedValue(CHALLENGE as never);
  vi.mocked(prisma.$queryRaw).mockResolvedValue(LEADERBOARD_ROWS);
});

describe("GET /api/daily-challenge/[date]/leaderboard", () => {
  it("returns 400 for an invalid date format", async () => {
    const [req, ctx] = makeRequest("not-a-date");
    const res = await GET(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when no challenge exists for the date", async () => {
    vi.mocked(getChallengeByDate).mockResolvedValue(null);
    const [req, ctx] = makeRequest("2026-01-15");
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 404 when challenge is not published", async () => {
    vi.mocked(getChallengeByDate).mockResolvedValue({ ...CHALLENGE, isPublished: false } as never);
    const [req, ctx] = makeRequest("2026-01-15");
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns entries with rank, username, and totalScore", async () => {
    const [req, ctx] = makeRequest("2026-01-15");
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const { entries } = await res.json();
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({ rank: 1, username: "alice", totalScore: 8000 });
    expect(entries[1]).toEqual({ rank: 2, username: "bob", totalScore: 6000 });
  });

  it("includes null username for anonymous players", async () => {
    const [req, ctx] = makeRequest("2026-01-15");
    const res = await GET(req, ctx);
    const { entries } = await res.json();
    expect(entries[2].username).toBeNull();
  });

  it("converts BigInt rank to number in response", async () => {
    const [req, ctx] = makeRequest("2026-01-15");
    const res = await GET(req, ctx);
    const { entries } = await res.json();
    expect(typeof entries[0].rank).toBe("number");
  });
});
