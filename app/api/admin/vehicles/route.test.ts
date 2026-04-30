// Tests for GET /api/admin/vehicles
import { vi, describe, it, expect, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    vehicle: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/app/lib/prisma";

const DB_VEHICLES = [
  { id: "v-1", make: "Ford", model: "Mustang", year: 1969, trim: "GT" },
  { id: "v-2", make: "Ford", model: "Mustang", year: 1970, trim: null },
];

function makeRequest(params?: Record<string, string>) {
  const url = new URL("http://localhost/api/admin/vehicles");
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

beforeEach(() => {
  vi.mocked(prisma.vehicle.findMany).mockResolvedValue(DB_VEHICLES as never);
});

describe("GET /api/admin/vehicles", () => {
  it("returns vehicles matching make and model", async () => {
    const res = await GET(makeRequest({ make: "Ford", model: "Mustang" }));
    const body = await res.json();
    expect(body.vehicles).toHaveLength(2);
    expect(body.vehicles[0]).toMatchObject({ id: "v-1", make: "Ford", model: "Mustang" });
  });

  it("queries with case-insensitive make and model filters", async () => {
    await GET(makeRequest({ make: "ford", model: "mustang" }));
    expect(vi.mocked(prisma.vehicle.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          make: { equals: "ford", mode: "insensitive" },
          model: { equals: "mustang", mode: "insensitive" },
        },
      })
    );
  });

  it("returns empty array when no vehicles match", async () => {
    vi.mocked(prisma.vehicle.findMany).mockResolvedValue([]);
    const res = await GET(makeRequest({ make: "Unknown", model: "Car" }));
    const body = await res.json();
    expect(body.vehicles).toEqual([]);
  });

  it("returns 400 when make is missing", async () => {
    const res = await GET(makeRequest({ model: "Mustang" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when model is missing", async () => {
    const res = await GET(makeRequest({ make: "Ford" }));
    expect(res.status).toBe(400);
  });

  it("limits results to 20", async () => {
    await GET(makeRequest({ make: "Ford", model: "Mustang" }));
    expect(vi.mocked(prisma.vehicle.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20 })
    );
  });
});
