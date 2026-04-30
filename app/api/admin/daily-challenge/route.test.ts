// Tests for GET /api/admin/daily-challenge
import { vi, describe, it, expect, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    dailyChallenge: { findMany: vi.fn() },
    image: { findMany: vi.fn() },
  },
}));

vi.mock("@/app/lib/game", () => ({
  imageUrl: (filename: string, vehicleId: string) => `https://cdn.example.com/${filename}?v=${vehicleId}`,
}));

import { prisma } from "@/app/lib/prisma";

const DB_CHALLENGE = {
  id: "c-1",
  date: new Date("2025-06-01"),
  generatedAt: new Date("2025-05-31T12:00:00Z"),
  imageIds: ["img-1"],
};

const DB_IMAGE = {
  id: "img-1",
  filename: "cars/supra",
  vehicle: { id: "v-1", make: "Toyota", model: "Supra" },
};

import { NextRequest } from "next/server";

function makeRequest(params?: Record<string, string>) {
  const url = new URL("http://localhost/api/admin/daily-challenge");
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

beforeEach(() => {
  vi.mocked(prisma.dailyChallenge.findMany).mockResolvedValue([DB_CHALLENGE] as never);
  vi.mocked(prisma.image.findMany).mockResolvedValue([DB_IMAGE] as never);
});

describe("GET /api/admin/daily-challenge", () => {
  it("returns challenges array in response", async () => {
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.challenges).toHaveLength(1);
  });

  it("formats date as YYYY-MM-DD", async () => {
    const res = await GET(makeRequest());
    const { challenges } = await res.json();
    expect(challenges[0].date).toBe("2025-06-01");
  });

  it("includes image details on each challenge", async () => {
    const res = await GET(makeRequest());
    const { challenges } = await res.json();
    expect(challenges[0].images[0]).toMatchObject({
      id: "img-1",
      make: "Toyota",
      model: "Supra",
    });
  });

  it("passes startDate as gte filter when provided", async () => {
    await GET(makeRequest({ startDate: "2025-06-01" }));
    expect(vi.mocked(prisma.dailyChallenge.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: expect.objectContaining({ gte: new Date("2025-06-01") }),
        }),
      })
    );
  });

  it("passes endDate as lte filter when provided", async () => {
    await GET(makeRequest({ endDate: "2025-06-30" }));
    expect(vi.mocked(prisma.dailyChallenge.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: expect.objectContaining({ lte: new Date("2025-06-30") }),
        }),
      })
    );
  });

  it("passes both date filters together", async () => {
    await GET(makeRequest({ startDate: "2025-06-01", endDate: "2025-06-30" }));
    expect(vi.mocked(prisma.dailyChallenge.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { date: { gte: new Date("2025-06-01"), lte: new Date("2025-06-30") } },
      })
    );
  });

  it("omits where clause when no date params are provided", async () => {
    await GET(makeRequest());
    expect(vi.mocked(prisma.dailyChallenge.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  it("returns 500 on database error", async () => {
    vi.mocked(prisma.dailyChallenge.findMany).mockRejectedValue(new Error("db down"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("db down");
  });
});
