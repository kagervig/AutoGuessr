import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/models/route";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    vehicle: { findMany: vi.fn() },
  },
}));

const { prisma } = await import("@/app/lib/prisma");

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/models");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/models", () => {
  it("should return 400 when make is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/make/i);
  });

  it("should return distinct models for the given make", async () => {
    vi.mocked(prisma.vehicle.findMany).mockResolvedValue([
      { model: "Supra" },
      { model: "Celica" },
    ] as never);

    const res = await GET(makeRequest({ make: "Toyota" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.models).toEqual(["Supra", "Celica"]);
  });

  it("should return an empty array when no models exist for the make", async () => {
    vi.mocked(prisma.vehicle.findMany).mockResolvedValue([] as never);

    const res = await GET(makeRequest({ make: "Fakemake" }));
    const data = await res.json();
    expect(data.models).toEqual([]);
  });
});
