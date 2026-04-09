import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/filters/route";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    category: { findMany: vi.fn() },
    region: { findMany: vi.fn() },
    vehicle: { groupBy: vi.fn() },
  },
}));

const { prisma } = await import("@/app/lib/prisma");

function makeCategoryRow(slug: string, label: string, count: number) {
  return { id: slug, slug, label, _count: { vehicles: count } };
}

function makeRegionRow(slug: string, label: string, count: number) {
  return { id: slug, slug, label, _count: { vehicles: count } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/filters", () => {
  it("should return categories, regions, and countries with sufficient vehicle counts", async () => {
    vi.mocked(prisma.category.findMany).mockResolvedValue([
      makeCategoryRow("sports", "Sports", 25),
      makeCategoryRow("rare", "Rare", 5), // below threshold
    ] as never);
    vi.mocked(prisma.region.findMany).mockResolvedValue([
      makeRegionRow("europe", "Europe", 30),
    ] as never);
    vi.mocked(prisma.vehicle.groupBy).mockResolvedValue([
      { countryOfOrigin: "JP", _count: { id: 25 } },
      { countryOfOrigin: "US", _count: { id: 3 } }, // below threshold
    ] as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.categories).toEqual([{ id: "sports", slug: "sports", label: "Sports" }]);
    expect(data.regions).toEqual([{ id: "europe", slug: "europe", label: "Europe" }]);
    expect(data.countries).toEqual([{ code: "JP", label: "Japan" }]);
  });

  it("should fall back to static lists when the database has no categories or regions", async () => {
    vi.mocked(prisma.category.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.region.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.vehicle.groupBy).mockResolvedValue([] as never);

    const res = await GET();
    const data = await res.json();

    expect(data.categories.length).toBeGreaterThan(0);
    expect(data.regions.length).toBeGreaterThan(0);
    expect(data.countries).toEqual([]);
  });

  it("should return an empty countries array when no country meets the threshold", async () => {
    vi.mocked(prisma.category.findMany).mockResolvedValue([
      makeCategoryRow("sports", "Sports", 25),
    ] as never);
    vi.mocked(prisma.region.findMany).mockResolvedValue([
      makeRegionRow("europe", "Europe", 30),
    ] as never);
    vi.mocked(prisma.vehicle.groupBy).mockResolvedValue([
      { countryOfOrigin: "JP", _count: { id: 1 } },
    ] as never);

    const res = await GET();
    const data = await res.json();
    expect(data.countries).toEqual([]);
  });
});
