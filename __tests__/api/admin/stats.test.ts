import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/stats/route";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    image: { findMany: vi.fn() },
  },
}));

const { prisma } = await import("@/app/lib/prisma");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin/stats", () => {
  it("should return active images with vehicle and stats data", async () => {
    vi.mocked(prisma.image.findMany).mockResolvedValue([
      {
        id: "img-1",
        filename: "car.jpg",
        vehicle: { make: "Toyota", model: "Supra", year: 1993 },
        stats: { correctGuesses: 10, incorrectGuesses: 5, skipCount: 2 },
      },
    ] as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].vehicle.make).toBe("Toyota");
    expect(data[0].stats.correctGuesses).toBe(10);
  });

  it("should return an empty array when no active images exist", async () => {
    vi.mocked(prisma.image.findMany).mockResolvedValue([] as never);

    const res = await GET();
    const data = await res.json();
    expect(data).toEqual([]);
  });
});
