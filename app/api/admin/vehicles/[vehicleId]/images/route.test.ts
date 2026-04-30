// Tests for GET /api/admin/vehicles/[vehicleId]/images
import { vi, describe, it, expect, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    image: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/app/lib/game", () => ({
  imageUrl: (filename: string, vehicleId: string) => `https://cdn/${filename}?v=${vehicleId}`,
}));

import { prisma } from "@/app/lib/prisma";

const DB_IMAGES = [
  { id: "img-1", filename: "cars/supra", vehicle: { id: "v-1" } },
  { id: "img-2", filename: "cars/supra2", vehicle: { id: "v-1" } },
];

function makeRequest(vehicleId: string) {
  const req = new NextRequest(`http://localhost/api/admin/vehicles/${vehicleId}/images`);
  return { req, params: Promise.resolve({ vehicleId }) };
}

beforeEach(() => {
  vi.mocked(prisma.image.findMany).mockResolvedValue(DB_IMAGES as never);
});

describe("GET /api/admin/vehicles/[vehicleId]/images", () => {
  it("returns images for the vehicle", async () => {
    const { req, params } = makeRequest("v-1");
    const res = await GET(req, { params });
    const body = await res.json();
    expect(body.images).toHaveLength(2);
    expect(body.images[0]).toMatchObject({ id: "img-1", url: "https://cdn/cars/supra?v=v-1" });
  });

  it("queries only active images for the given vehicleId", async () => {
    const { req, params } = makeRequest("v-1");
    await GET(req, { params });
    expect(vi.mocked(prisma.image.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { vehicleId: "v-1", isActive: true },
      })
    );
  });

  it("returns empty array when vehicle has no active images", async () => {
    vi.mocked(prisma.image.findMany).mockResolvedValue([]);
    const { req, params } = makeRequest("v-unknown");
    const res = await GET(req, { params });
    const body = await res.json();
    expect(body.images).toEqual([]);
  });
});
