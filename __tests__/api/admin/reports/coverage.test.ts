// Tests for the image coverage report route and its response-shaping logic.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCoverageReport } from "@/app/api/admin/reports/coverage/types";

vi.mock("@/app/lib/prisma", () => ({
  prisma: { $queryRaw: vi.fn() },
}));

const { prisma } = await import("@/app/lib/prisma");

beforeEach(() => {
  vi.clearAllMocks();
});

const VEHICLE_ROWS = [
  { vehicle_id: "v1", make: "Toyota", model: "Supra",   year: BigInt(1993), trim: "Turbo", count: BigInt(5) },
  { vehicle_id: "v2", make: "Honda",  model: "NSX",     year: BigInt(1991), trim: null,    count: BigInt(2) },
  { vehicle_id: "v3", make: "Toyota", model: "Celica",  year: BigInt(1985), trim: null,    count: BigInt(1) },
];

const MAKE_ROWS = [
  { make: "Toyota", count: BigInt(6) },
  { make: "Honda",  count: BigInt(2) },
];

const MODEL_ROWS = [
  { make: "Toyota", model: "Supra",  count: BigInt(5) },
  { make: "Toyota", model: "Celica", count: BigInt(1) },
  { make: "Honda",  model: "NSX",    count: BigInt(2) },
];

describe("buildCoverageReport", () => {
  it("should map all three result sets into the coverage report shape", () => {
    const report = buildCoverageReport(VEHICLE_ROWS, MAKE_ROWS, MODEL_ROWS);

    expect(report.byVehicle).toHaveLength(3);
    expect(report.byVehicle[0]).toEqual({
      vehicleId: "v1", make: "Toyota", model: "Supra", year: 1993, trim: "Turbo", count: 5,
    });
    expect(report.byVehicle[1].trim).toBeNull();

    expect(report.byMake).toHaveLength(2);
    expect(report.byMake[0]).toEqual({ make: "Toyota", count: 6 });

    expect(report.byModel).toHaveLength(3);
    expect(report.byModel[0]).toEqual({ make: "Toyota", model: "Supra", count: 5 });
  });

  it("should coerce bigint values to number", () => {
    const report = buildCoverageReport(VEHICLE_ROWS, MAKE_ROWS, MODEL_ROWS);
    expect(typeof report.byVehicle[0].count).toBe("number");
    expect(typeof report.byVehicle[0].year).toBe("number");
    expect(typeof report.byMake[0].count).toBe("number");
    expect(typeof report.byModel[0].count).toBe("number");
  });

  it("should return empty arrays when there are no images", () => {
    const report = buildCoverageReport([], [], []);
    expect(report.byVehicle).toEqual([]);
    expect(report.byMake).toEqual([]);
    expect(report.byModel).toEqual([]);
  });
});

describe("GET /api/admin/reports/coverage", () => {
  it("should return 200 with a coverage report", async () => {
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce(VEHICLE_ROWS as never)
      .mockResolvedValueOnce(MAKE_ROWS as never)
      .mockResolvedValueOnce(MODEL_ROWS as never);

    const { GET } = await import("@/app/api/admin/reports/coverage/route");
    const res = await GET();

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.byVehicle).toHaveLength(3);
    expect(data.byMake).toHaveLength(2);
    expect(data.byModel).toHaveLength(3);
    expect(data.byVehicle[0].count).toBe(5);
    expect(data.byMake[0].make).toBe("Toyota");
  });

  it("should return 200 with empty arrays when no images exist", async () => {
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);

    const { GET } = await import("@/app/api/admin/reports/coverage/route");
    const res = await GET();
    const data = await res.json();
    expect(data.byVehicle).toEqual([]);
    expect(data.byMake).toEqual([]);
    expect(data.byModel).toEqual([]);
  });
});
