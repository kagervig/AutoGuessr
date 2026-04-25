// Tests for GET /api/admin/images
import { vi, describe, it, expect, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    image: { findMany: vi.fn() },
  },
}));

vi.mock("@/app/lib/game", () => ({
  imageUrl: (filename: string, vehicleId: string) => `https://cdn.example.com/${filename}?v=${vehicleId}`,
}));

import { prisma } from "@/app/lib/prisma";

const DB_IMAGE = {
  id: "img-1",
  filename: "cars/supra",
  isActive: true,
  isHardcoreEligible: true,
  copyrightHolder: "Wikimedia",
  isCropped: false,
  isLogoVisible: false,
  isModelNameVisible: false,
  hasMultipleVehicles: false,
  isFaceVisible: false,
  isVehicleUnmodified: true,
  uploadedAt: new Date("2024-01-01"),
  vehicle: {
    id: "v-1",
    make: "Toyota",
    model: "Supra",
    year: 1994,
    trim: "RZ",
    bodyStyle: "coupe",
    era: "modern",
    rarity: "uncommon",
    countryOfOrigin: "Japan",
    region: { slug: "japan" },
    categories: [{ category: { slug: "sports" } }, { category: { slug: "jdm" } }],
  },
};

beforeEach(() => {
  vi.mocked(prisma.image.findMany).mockResolvedValue([DB_IMAGE] as never);
});

describe("GET /api/admin/images", () => {
  it("returns items array in response", async () => {
    const res = await GET(new Request("http://localhost/api/admin/images") as any);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
  });

  it("maps image fields correctly", async () => {
    const res = await GET(new Request("http://localhost/api/admin/images") as any);
    const { items } = await res.json();
    const item = items[0];
    expect(item.id).toBe("img-1");
    expect(item.filename).toBe("cars/supra");
    expect(item.isActive).toBe(true);
    expect(item.isHardcoreEligible).toBe(true);
    expect(item.copyrightHolder).toBe("Wikimedia");
    expect(item.isCropped).toBe(false);
  });

  it("maps vehicle fields correctly", async () => {
    const res = await GET(new Request("http://localhost/api/admin/images") as any);
    const { items } = await res.json();
    const { vehicle } = items[0];
    expect(vehicle.id).toBe("v-1");
    expect(vehicle.make).toBe("Toyota");
    expect(vehicle.model).toBe("Supra");
    expect(vehicle.year).toBe(1994);
    expect(vehicle.trim).toBe("RZ");
    expect(vehicle.bodyStyle).toBe("coupe");
    expect(vehicle.era).toBe("modern");
    expect(vehicle.rarity).toBe("uncommon");
    expect(vehicle.countryOfOrigin).toBe("Japan");
    expect(vehicle.regionSlug).toBe("japan");
  });

  it("flattens category slugs into an array", async () => {
    const res = await GET(new Request("http://localhost/api/admin/images") as any);
    const { items } = await res.json();
    expect(items[0].vehicle.categories).toEqual(["sports", "jdm"]);
  });

  it("generates imageUrl from filename and vehicle id", async () => {
    const res = await GET(new Request("http://localhost/api/admin/images") as any);
    const { items } = await res.json();
    expect(items[0].imageUrl).toBe("https://cdn.example.com/cars/supra?v=v-1");
  });

  it("returns an empty items array when there are no images", async () => {
    vi.mocked(prisma.image.findMany).mockResolvedValue([] as never);
    const res = await GET(new Request("http://localhost/api/admin/images") as any);
    const body = await res.json();
    expect(body.items).toEqual([]);
  });

  it("queries images ordered by uploadedAt descending", async () => {
    await GET(new Request("http://localhost/api/admin/images") as any);
    expect(prisma.image.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { uploadedAt: "desc" } })
    );
  });
});
