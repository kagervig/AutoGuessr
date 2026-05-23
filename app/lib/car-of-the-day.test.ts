import { describe, it, expect, vi, afterEach } from "vitest";
import { Prisma } from "../generated/prisma/client";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    featuredVehicleOfDay: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    vehicle: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

const { prisma } = await import("@/app/lib/prisma");
const { selectAndInsertFeatured, getFeatured } = await import(
  "@/app/lib/car-of-the-day"
);

afterEach(() => {
  vi.clearAllMocks();
});

describe("selectAndInsertFeatured race condition", () => {
  it("should handle a race condition (P2002) during creation by fetching the existing record", async () => {
    const date = new Date("2026-05-23T00:00:00Z");
    const mockVehicle = { id: "v1", make: "Test", model: "Car", images: [{ id: "i1", filename: "f1.jpg", isCropped: false, isLogoVisible: true }] };
    const mockFeatured = { date, vehicleId: "v1", imageId: "i1", vehicle: mockVehicle, image: { id: "i1", filename: "f1.jpg" } };

    // Setup pool for selection
    vi.mocked(prisma.featuredVehicleOfDay.findMany).mockResolvedValue([]);
    vi.mocked(prisma.vehicle.findMany).mockResolvedValue([mockVehicle]);

    // Simulate someone else creating it in the split-second before we do
    const p2002Error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "mock",
    });
    
    vi.mocked(prisma.featuredVehicleOfDay.create).mockRejectedValue(p2002Error);
    
    // The fallback fetch
    vi.mocked(prisma.featuredVehicleOfDay.findUnique).mockResolvedValue(mockFeatured);

    const result = await selectAndInsertFeatured(date);

    expect(result).toEqual(mockFeatured);
    expect(prisma.featuredVehicleOfDay.create).toHaveBeenCalled();
    expect(prisma.featuredVehicleOfDay.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { date }
    }));
  });

  it("should throw if the fallback fetch also fails to find the record", async () => {
    const date = new Date("2026-05-23T00:00:00Z");
    const mockVehicle = { id: "v1", make: "Test", model: "Car", images: [{ id: "i1", filename: "f1.jpg", isCropped: false, isLogoVisible: true }] };

    vi.mocked(prisma.featuredVehicleOfDay.findMany).mockResolvedValue([]);
    vi.mocked(prisma.vehicle.findMany).mockResolvedValue([mockVehicle]);

    const p2002Error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "mock",
    });
    
    vi.mocked(prisma.featuredVehicleOfDay.create).mockRejectedValue(p2002Error);
    vi.mocked(prisma.featuredVehicleOfDay.findUnique).mockResolvedValue(null);

    await expect(selectAndInsertFeatured(date)).rejects.toThrow("Failed to get or create featured vehicle");
  });
});
