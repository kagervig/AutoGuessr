import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/stats/route";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    image: { findMany: vi.fn() },
  },
}));

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL(`http://localhost/api/admin/stats?${new URLSearchParams(params)}`);
  return { nextUrl: url } as import("next/server").NextRequest;
}

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

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].vehicle.make).toBe("Toyota");
    expect(data[0].stats.correctGuesses).toBe(10);
  });

  it("should return an empty array when no active images exist", async () => {
    vi.mocked(prisma.image.findMany).mockResolvedValue([] as never);

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it("should pass vehicleId filter to Prisma when provided", async () => {
    vi.mocked(prisma.image.findMany).mockResolvedValue([] as never);

    await GET(makeRequest({ vehicleId: "v-123" }));

    expect(vi.mocked(prisma.image.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ vehicleId: "v-123" }) })
    );
  });

  it("should pass make filter to Prisma when provided", async () => {
    vi.mocked(prisma.image.findMany).mockResolvedValue([] as never);

    await GET(makeRequest({ make: "Toyota" }));

    expect(vi.mocked(prisma.image.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ vehicle: expect.objectContaining({ make: "Toyota" }) }),
      })
    );
  });

  it("should pass make and model filters together when both are provided", async () => {
    vi.mocked(prisma.image.findMany).mockResolvedValue([] as never);

    await GET(makeRequest({ make: "Toyota", model: "Supra" }));

    expect(vi.mocked(prisma.image.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          vehicle: expect.objectContaining({ make: "Toyota", model: "Supra" }),
        }),
      })
    );
  });
});
