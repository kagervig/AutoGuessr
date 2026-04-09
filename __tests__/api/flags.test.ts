import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/flags/route";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    featureFlag: { findMany: vi.fn() },
  },
}));

const { prisma } = await import("@/app/lib/prisma");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/flags", () => {
  it("should return a map of flag keys to enabled state", async () => {
    vi.mocked(prisma.featureFlag.findMany).mockResolvedValue([
      { id: "1", key: "new_ui", enabled: true },
      { id: "2", key: "beta_mode", enabled: false },
    ] as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ new_ui: true, beta_mode: false });
  });

  it("should return an empty object when no flags exist", async () => {
    vi.mocked(prisma.featureFlag.findMany).mockResolvedValue([] as never);

    const res = await GET();
    const data = await res.json();
    expect(data).toEqual({});
  });
});
