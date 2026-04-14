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
  { slot: "rookie_pool",              count: 100 },
  { slot: "rookie_standard_pool",     count: 80  },
  { slot: "rookie_cropped_pool",      count: 20  },
  { slot: "rookie_slot_a",            count: 60  },
  { slot: "rookie_slot_b",            count: 15  },
  { slot: "rookie_slot_c",            count: 20  },
  { slot: "rookie_slot_d",            count: 80  },
  { slot: "standard_pool",            count: 200 },
  { slot: "standard_slot_a",          count: 40  },
  { slot: "standard_slot_b",          count: 55  },
  { slot: "standard_slot_c",          count: 30  },
  { slot: "standard_slot_d",          count: 120 },
  { slot: "standard_slot_e",          count: 200 },
  { slot: "hardcore_pool",            count: 90  },
  { slot: "hardcore_slot_a",          count: 50  },
  { slot: "hardcore_slot_a_with_model", count: 18 },
  { slot: "hardcore_slot_a_no_model", count: 32  },
  { slot: "hardcore_slot_b",          count: 25  },
  { slot: "hardcore_slot_c",          count: 10  },
  { slot: "hardcore_slot_d",          count: 40  },
  { slot: "hardcore_slot_e",          count: 90  },
];

describe("buildReport", () => {
  it("should map flat slot rows to the structured report shape", () => {
    const report = buildReport(ALL_SLOTS, 500);

    expect(report.totalActiveImages).toBe(500);
    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    expect(report.rookie.pool).toBe(100);
    expect(report.rookie.standardPool).toBe(80);
    expect(report.rookie.croppedPool).toBe(20);
    expect(report.rookie.slotA).toBe(60);
    expect(report.rookie.slotB).toBe(15);
    expect(report.rookie.slotC).toBe(20);
    expect(report.rookie.slotD).toBe(80);

    expect(report.standard.pool).toBe(200);
    expect(report.standard.slotA).toBe(40);
    expect(report.standard.slotB).toBe(55);
    expect(report.standard.slotC).toBe(30);
    expect(report.standard.slotD).toBe(120);
    expect(report.standard.slotE).toBe(200);

    expect(report.hardcore.pool).toBe(90);
    expect(report.hardcore.slotA).toBe(50);
    expect(report.hardcore.slotAWithModel).toBe(18);
    expect(report.hardcore.slotANoModel).toBe(32);
    expect(report.hardcore.slotB).toBe(25);
    expect(report.hardcore.slotC).toBe(10);
    expect(report.hardcore.slotD).toBe(40);
    expect(report.hardcore.slotE).toBe(90);
  });

  it("should default missing slots to 0", () => {
    const report = buildReport([], 0);

    expect(report.totalActiveImages).toBe(0);
    expect(report.rookie.pool).toBe(0);
    expect(report.rookie.slotA).toBe(0);
    expect(report.standard.pool).toBe(0);
    expect(report.standard.slotE).toBe(0);
    expect(report.hardcore.pool).toBe(0);
    expect(report.hardcore.slotAWithModel).toBe(0);
  });

  it("should coerce bigint counts to number", () => {
    const rows = [{ slot: "rookie_pool", count: BigInt(42) }];
    const report = buildReport(rows, 42);
    expect(report.rookie.pool).toBe(42);
    expect(typeof report.rookie.pool).toBe("number");
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
    expect(data.rookie.pool).toBe(100);
    expect(data.standard.pool).toBe(200);
    expect(data.hardcore.pool).toBe(90);
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
    expect(data.rookie.pool).toBe(0);
    expect(data.hardcore.slotA).toBe(0);
  });
});
