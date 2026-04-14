// Tests for PUT /api/admin/images/[id]
import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PUT } from "./route";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    image: { findUnique: vi.fn(), update: vi.fn() },
    vehicle: { findUnique: vi.fn(), update: vi.fn() },
    region: { findUnique: vi.fn() },
    vehicleCategory: { deleteMany: vi.fn(), createMany: vi.fn() },
    category: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/app/lib/prisma";

const PARAMS = { params: Promise.resolve({ id: "img-1" }) };

const DB_IMAGE_ROW = { vehicleId: "v-1" };

const UPDATED_IMAGE = {
  id: "img-1",
  isActive: true,
  isHardcoreEligible: false,
  copyrightHolder: null,
  isCropped: false,
  isLogoVisible: false,
  isModelNameVisible: false,
  hasMultipleVehicles: false,
  isFaceVisible: false,
  isVehicleUnmodified: true,
  vehicle: {
    id: "v-1",
    region: { slug: "japan" },
    categories: [],
  },
};

const FULL_VEHICLE = {
  id: "v-1",
  make: "Toyota",
  model: "Supra",
  year: 1994,
  trim: null,
  bodyStyle: "coupe",
  era: "modern",
  rarity: "uncommon",
  countryOfOrigin: "Japan",
  region: { slug: "japan" },
  categories: [{ category: { slug: "sports" } }],
};

function makeRequest(body: Record<string, unknown>, id = "img-1") {
  return new NextRequest(`http://localhost/api/admin/images/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function setupHappyPath() {
  vi.mocked(prisma.image.findUnique).mockResolvedValue(DB_IMAGE_ROW as never);
  vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    return fn({
      image: { update: vi.fn().mockResolvedValue(UPDATED_IMAGE) },
      vehicle: { update: vi.fn() },
      vehicleCategory: { deleteMany: vi.fn(), createMany: vi.fn() },
      category: { findMany: vi.fn().mockResolvedValue([]) },
    });
  });
  vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(FULL_VEHICLE as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PUT /api/admin/images/[id]", () => {
  describe("not found", () => {
    it("returns 404 when image does not exist", async () => {
      vi.mocked(prisma.image.findUnique).mockResolvedValue(null);
      const res = await PUT(makeRequest({}), PARAMS);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("Not found");
    });
  });

  describe("region validation", () => {
    it("returns 400 when regionSlug does not match any region", async () => {
      vi.mocked(prisma.image.findUnique).mockResolvedValue(DB_IMAGE_ROW as never);
      vi.mocked(prisma.region.findUnique).mockResolvedValue(null);
      const res = await PUT(makeRequest({ regionSlug: "nonexistent" }), PARAMS);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("nonexistent");
    });

    it("looks up region when regionSlug is provided", async () => {
      setupHappyPath();
      vi.mocked(prisma.region.findUnique).mockResolvedValue({ id: "r-1", slug: "japan" } as never);
      await PUT(makeRequest({ regionSlug: "japan" }), PARAMS);
      expect(prisma.region.findUnique).toHaveBeenCalledWith({ where: { slug: "japan" } });
    });

    it("skips region lookup when regionSlug is not provided", async () => {
      setupHappyPath();
      await PUT(makeRequest({ make: "Toyota" }), PARAMS);
      expect(prisma.region.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("image field updates", () => {
    it("passes isActive to the image update", async () => {
      setupHappyPath();
      let capturedImageData: Record<string, unknown> = {};
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          image: {
            update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
              capturedImageData = data;
              return Promise.resolve(UPDATED_IMAGE);
            }),
          },
          vehicle: { update: vi.fn() },
          vehicleCategory: { deleteMany: vi.fn(), createMany: vi.fn() },
          category: { findMany: vi.fn().mockResolvedValue([]) },
        });
      });

      await PUT(makeRequest({ isActive: false }), PARAMS);
      expect(capturedImageData.isActive).toBe(false);
    });

    it("omits image fields that are not provided in the body", async () => {
      setupHappyPath();
      let capturedImageData: Record<string, unknown> = {};
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          image: {
            update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
              capturedImageData = data;
              return Promise.resolve(UPDATED_IMAGE);
            }),
          },
          vehicle: { update: vi.fn() },
          vehicleCategory: { deleteMany: vi.fn(), createMany: vi.fn() },
          category: { findMany: vi.fn().mockResolvedValue([]) },
        });
      });

      await PUT(makeRequest({ make: "Toyota" }), PARAMS);
      expect("isActive" in capturedImageData).toBe(false);
    });
  });

  describe("vehicle field updates", () => {
    it("updates vehicle when vehicle fields are provided", async () => {
      setupHappyPath();
      const vehicleUpdate = vi.fn();
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          image: { update: vi.fn().mockResolvedValue(UPDATED_IMAGE) },
          vehicle: { update: vehicleUpdate },
          vehicleCategory: { deleteMany: vi.fn(), createMany: vi.fn() },
          category: { findMany: vi.fn().mockResolvedValue([]) },
        });
      });

      await PUT(makeRequest({ make: "Honda", model: "Civic", year: "1998" }), PARAMS);
      expect(vehicleUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "v-1" },
          data: expect.objectContaining({ make: "Honda", model: "Civic", year: 1998 }),
        })
      );
    });

    it("parses year from string to integer", async () => {
      setupHappyPath();
      const vehicleUpdate = vi.fn();
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          image: { update: vi.fn().mockResolvedValue(UPDATED_IMAGE) },
          vehicle: { update: vehicleUpdate },
          vehicleCategory: { deleteMany: vi.fn(), createMany: vi.fn() },
          category: { findMany: vi.fn().mockResolvedValue([]) },
        });
      });

      await PUT(makeRequest({ year: "1994" }), PARAMS);
      const data = vehicleUpdate.mock.calls[0][0].data;
      expect(data.year).toBe(1994);
      expect(typeof data.year).toBe("number");
    });

    it("does not update vehicle when no vehicle fields are provided", async () => {
      setupHappyPath();
      const vehicleUpdate = vi.fn();
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          image: { update: vi.fn().mockResolvedValue(UPDATED_IMAGE) },
          vehicle: { update: vehicleUpdate },
          vehicleCategory: { deleteMany: vi.fn(), createMany: vi.fn() },
          category: { findMany: vi.fn().mockResolvedValue([]) },
        });
      });

      await PUT(makeRequest({ isActive: true }), PARAMS);
      expect(vehicleUpdate).not.toHaveBeenCalled();
    });
  });

  describe("category updates", () => {
    it("replaces all categories when categories array is provided", async () => {
      setupHappyPath();
      const deleteMany = vi.fn();
      const createMany = vi.fn();
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          image: { update: vi.fn().mockResolvedValue(UPDATED_IMAGE) },
          vehicle: { update: vi.fn() },
          vehicleCategory: { deleteMany, createMany },
          category: { findMany: vi.fn().mockResolvedValue([{ id: "cat-1", slug: "sports" }]) },
        });
      });

      await PUT(makeRequest({ categories: ["sports"] }), PARAMS);
      expect(deleteMany).toHaveBeenCalledWith({ where: { vehicleId: "v-1" } });
      expect(createMany).toHaveBeenCalledWith({
        data: [{ vehicleId: "v-1", categoryId: "cat-1" }],
      });
    });

    it("deletes all categories but skips createMany when categories is empty", async () => {
      setupHappyPath();
      const deleteMany = vi.fn();
      const createMany = vi.fn();
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          image: { update: vi.fn().mockResolvedValue(UPDATED_IMAGE) },
          vehicle: { update: vi.fn() },
          vehicleCategory: { deleteMany, createMany },
          category: { findMany: vi.fn().mockResolvedValue([]) },
        });
      });

      await PUT(makeRequest({ categories: [] }), PARAMS);
      expect(deleteMany).toHaveBeenCalled();
      expect(createMany).not.toHaveBeenCalled();
    });

    it("skips category operations when categories is not provided", async () => {
      setupHappyPath();
      const deleteMany = vi.fn();
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          image: { update: vi.fn().mockResolvedValue(UPDATED_IMAGE) },
          vehicle: { update: vi.fn() },
          vehicleCategory: { deleteMany, createMany: vi.fn() },
          category: { findMany: vi.fn().mockResolvedValue([]) },
        });
      });

      await PUT(makeRequest({ make: "Toyota" }), PARAMS);
      expect(deleteMany).not.toHaveBeenCalled();
    });
  });

  describe("successful response", () => {
    it("returns 200 with updated image and vehicle data", async () => {
      setupHappyPath();
      const res = await PUT(makeRequest({ isActive: true }), PARAMS);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe("img-1");
      expect(body.vehicle).not.toBeNull();
    });

    it("includes flattened vehicle data from the post-transaction re-fetch", async () => {
      setupHappyPath();
      const res = await PUT(makeRequest({ make: "Toyota" }), PARAMS);
      const body = await res.json();
      expect(body.vehicle.make).toBe("Toyota");
      expect(body.vehicle.model).toBe("Supra");
      expect(body.vehicle.regionSlug).toBe("japan");
      expect(body.vehicle.categories).toEqual(["sports"]);
    });

    it("re-fetches vehicle after the transaction", async () => {
      setupHappyPath();
      await PUT(makeRequest({ make: "Toyota" }), PARAMS);
      expect(prisma.vehicle.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "v-1" } })
      );
    });
  });
});
