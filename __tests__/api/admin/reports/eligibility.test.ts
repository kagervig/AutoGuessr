// Tests for the eligibility report route and its response-shaping logic.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildReport } from "@/app/api/admin/reports/eligibility/types";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    image: { count: vi.fn() },
  },
}));

const { prisma } = await import("@/app/lib/prisma");

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// buildReport — pure function, no DB
// ---------------------------------------------------------------------------

const ALL_SLOTS = [
  { slot: "rookie_pool",                count: 100, distinct_makes: 75  },
  { slot: "rookie_standard_pool",       count: 80,  distinct_makes: 60  },
  { slot: "rookie_cropped_pool",        count: 20,  distinct_makes: 18  },
  { slot: "rookie_slot_a",             count: 60,  distinct_makes: 45  },
  { slot: "rookie_slot_b",             count: 15,  distinct_makes: 12  },
  { slot: "rookie_slot_c",             count: 20,  distinct_makes: 18  },
  { slot: "rookie_slot_d",             count: 80,  distinct_makes: 60  },
  { slot: "standard_pool",             count: 200, distinct_makes: 150 },
  { slot: "standard_slot_a",           count: 40,  distinct_makes: 30  },
  { slot: "standard_slot_b",           count: 55,  distinct_makes: 40  },
  { slot: "standard_slot_c",           count: 30,  distinct_makes: 25  },
  { slot: "standard_slot_d",           count: 120, distinct_makes: 90  },
  { slot: "standard_slot_e",           count: 200, distinct_makes: 150 },
  { slot: "hardcore_pool",             count: 90,  distinct_makes: 70  },
  { slot: "hardcore_slot_a",           count: 50,  distinct_makes: 40  },
  { slot: "hardcore_slot_a_with_model",count: 18,  distinct_makes: 15  },
  { slot: "hardcore_slot_a_no_model",  count: 32,  distinct_makes: 28  },
  { slot: "hardcore_slot_b",           count: 25,  distinct_makes: 20  },
  { slot: "hardcore_slot_c",           count: 10,  distinct_makes: 8   },
  { slot: "hardcore_slot_d",           count: 40,  distinct_makes: 32  },
  { slot: "hardcore_slot_e",           count: 90,  distinct_makes: 70  },
];

describe("buildReport", () => {
  it("should map flat slot rows to the structured report shape", () => {
    const report = buildReport(ALL_SLOTS, 500);

    expect(report.totalActiveImages).toBe(500);
    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    expect(report.rookie.pool).toEqual({ images: 100, distinctCars: 75 });
    expect(report.rookie.standardPool).toEqual({ images: 80, distinctCars: 60 });
    expect(report.rookie.croppedPool).toEqual({ images: 20, distinctCars: 18 });
    expect(report.rookie.slotA).toEqual({ images: 60, distinctCars: 45 });
    expect(report.rookie.slotB).toEqual({ images: 15, distinctCars: 12 });
    expect(report.rookie.slotC).toEqual({ images: 20, distinctCars: 18 });
    expect(report.rookie.slotD).toEqual({ images: 80, distinctCars: 60 });

    expect(report.standard.pool).toEqual({ images: 200, distinctCars: 150 });
    expect(report.standard.slotA).toEqual({ images: 40, distinctCars: 30 });
    expect(report.standard.slotB).toEqual({ images: 55, distinctCars: 40 });
    expect(report.standard.slotC).toEqual({ images: 30, distinctCars: 25 });
    expect(report.standard.slotD).toEqual({ images: 120, distinctCars: 90 });
    expect(report.standard.slotE).toEqual({ images: 200, distinctCars: 150 });

    expect(report.hardcore.pool).toEqual({ images: 90, distinctCars: 70 });
    expect(report.hardcore.slotA).toEqual({ images: 50, distinctCars: 40 });
    expect(report.hardcore.slotAWithModel).toEqual({ images: 18, distinctCars: 15 });
    expect(report.hardcore.slotANoModel).toEqual({ images: 32, distinctCars: 28 });
    expect(report.hardcore.slotB).toEqual({ images: 25, distinctCars: 20 });
    expect(report.hardcore.slotC).toEqual({ images: 10, distinctCars: 8 });
    expect(report.hardcore.slotD).toEqual({ images: 40, distinctCars: 32 });
    expect(report.hardcore.slotE).toEqual({ images: 90, distinctCars: 70 });
  });

  it("should default missing slots to 0", () => {
    const report = buildReport([], 0);

    expect(report.totalActiveImages).toBe(0);
    expect(report.rookie.pool).toEqual({ images: 0, distinctCars: 0 });
    expect(report.rookie.slotA).toEqual({ images: 0, distinctCars: 0 });
    expect(report.standard.pool).toEqual({ images: 0, distinctCars: 0 });
    expect(report.standard.slotE).toEqual({ images: 0, distinctCars: 0 });
    expect(report.hardcore.pool).toEqual({ images: 0, distinctCars: 0 });
    expect(report.hardcore.slotAWithModel).toEqual({ images: 0, distinctCars: 0 });
  });

  it("should coerce bigint counts to number", () => {
    const rows = [{ slot: "rookie_pool", count: BigInt(42), distinct_makes: BigInt(30) }];
    const report = buildReport(rows, 42);
    expect(report.rookie.pool).toEqual({ images: 42, distinctCars: 30 });
    expect(typeof report.rookie.pool.images).toBe("number");
    expect(typeof report.rookie.pool.distinctCars).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/reports/eligibility — integration-style with mocked Prisma
// ---------------------------------------------------------------------------

describe("GET /api/admin/reports/eligibility", () => {
  it("should return 200 with a structured eligibility report", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue(ALL_SLOTS as never);
    vi.mocked(prisma.image.count).mockResolvedValue(500);

    const { GET } = await import("@/app/api/admin/reports/eligibility/route");
    const res = await GET();

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalActiveImages).toBe(500);
    expect(data.rookie.pool).toEqual({ images: 100, distinctCars: 75 });
    expect(data.standard.pool).toEqual({ images: 200, distinctCars: 150 });
    expect(data.hardcore.pool).toEqual({ images: 90, distinctCars: 70 });
    expect(data.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("should return 200 with zero counts when there are no images", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([] as never);
    vi.mocked(prisma.image.count).mockResolvedValue(0);

    const { GET } = await import("@/app/api/admin/reports/eligibility/route");
    const res = await GET();

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalActiveImages).toBe(0);
    expect(data.rookie.pool).toEqual({ images: 0, distinctCars: 0 });
    expect(data.hardcore.slotA).toEqual({ images: 0, distinctCars: 0 });
  });
});
