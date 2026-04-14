// Tests for the image flags breakdown route and its response-shaping logic.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildFlagsReport } from "@/app/api/admin/flags/route";

vi.mock("@/app/lib/prisma", () => ({
  prisma: { $queryRaw: vi.fn() },
}));

const { prisma } = await import("@/app/lib/prisma");

beforeEach(() => {
  vi.clearAllMocks();
});

const SAMPLE_ROW = {
  total:                 BigInt(500),
  hardcore_eligible:     BigInt(80),
  cropped:               BigInt(120),
  logo_visible:          BigInt(200),
  model_name_visible:    BigInt(90),
  has_multiple_vehicles: BigInt(15),
  face_visible:          BigInt(30),
  vehicle_unmodified:    BigInt(460),
};

describe("buildFlagsReport", () => {
  it("should map the aggregate row into the flags report shape", () => {
    const report = buildFlagsReport(SAMPLE_ROW);

    expect(report.total).toBe(500);
    expect(report.flags.hardcoreEligible).toBe(80);
    expect(report.flags.cropped).toBe(120);
    expect(report.flags.logoVisible).toBe(200);
    expect(report.flags.modelNameVisible).toBe(90);
    expect(report.flags.hasMultipleVehicles).toBe(15);
    expect(report.flags.faceVisible).toBe(30);
    expect(report.flags.vehicleUnmodified).toBe(460);
  });

  it("should coerce bigint values to number", () => {
    const report = buildFlagsReport(SAMPLE_ROW);
    expect(typeof report.total).toBe("number");
    expect(typeof report.flags.hardcoreEligible).toBe("number");
    expect(typeof report.flags.vehicleUnmodified).toBe("number");
  });

  it("should handle a zero-image database", () => {
    const empty = {
      total:                 BigInt(0),
      hardcore_eligible:     BigInt(0),
      cropped:               BigInt(0),
      logo_visible:          BigInt(0),
      model_name_visible:    BigInt(0),
      has_multiple_vehicles: BigInt(0),
      face_visible:          BigInt(0),
      vehicle_unmodified:    BigInt(0),
    };
    const report = buildFlagsReport(empty);
    expect(report.total).toBe(0);
    expect(report.flags.hardcoreEligible).toBe(0);
  });
});

describe("GET /api/admin/flags", () => {
  it("should return 200 with a flags report", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([SAMPLE_ROW] as never);

    const { GET } = await import("@/app/api/admin/flags/route");
    const res = await GET();

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(500);
    expect(data.flags.hardcoreEligible).toBe(80);
    expect(data.flags.logoVisible).toBe(200);
  });

  it("should return 200 with zeros when no images exist", async () => {
    const empty = {
      total: BigInt(0), hardcore_eligible: BigInt(0), cropped: BigInt(0),
      logo_visible: BigInt(0), model_name_visible: BigInt(0),
      has_multiple_vehicles: BigInt(0), face_visible: BigInt(0),
      vehicle_unmodified: BigInt(0),
    };
    vi.mocked(prisma.$queryRaw).mockResolvedValue([empty] as never);

    const { GET } = await import("@/app/api/admin/flags/route");
    const res = await GET();

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(0);
    expect(data.flags.cropped).toBe(0);
  });
});
