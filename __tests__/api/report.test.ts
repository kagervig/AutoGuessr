import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/report/route";

vi.mock("@/app/lib/prisma", () => {
  const image = { findUnique: vi.fn() };
  const imageReport = { create: vi.fn() };
  const imageStats = { upsert: vi.fn() };
  const tx = { image, imageReport, imageStats };
  return {
    prisma: {
      image,
      imageReport,
      imageStats,
      $transaction: vi.fn((fn: (tx: typeof tx) => Promise<unknown>) => fn(tx)),
    },
  };
});

const { prisma } = await import("@/app/lib/prisma");

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/report", () => {
  const payload = {
    imageId: "img-123",
    certainty: 90,
    comment: "Wrong model year",
    suggestedMake: "Toyota",
    suggestedModel: "Supra",
    suggestedYear: 1994,
  };

  it("should return 400 if imageId is missing", async () => {
    const req = makeRequest({ certainty: 50 });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Image ID is required");
  });

  it("should return 404 if image is not found", async () => {
    vi.mocked(prisma.image.findUnique).mockResolvedValue(null);
    const req = makeRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Image not found");
  });

  it("should create a report and update image stats/review status", async () => {
    vi.mocked(prisma.image.findUnique).mockResolvedValue({ id: "img-123" } as any);
    vi.mocked(prisma.imageReport.create).mockResolvedValue({ id: "rep-1" } as any);

    const req = makeRequest(payload);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    expect(prisma.imageReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        imageId: "img-123",
        certainty: 90,
        comment: "Wrong model year",
        suggestedMake: "Toyota",
        suggestedModel: "Supra",
        suggestedYear: 1994,
      }),
    });

    expect(prisma.imageStats.upsert).toHaveBeenCalledWith({
      where: { imageId: "img-123" },
      update: { reportCount: { increment: 1 } },
      create: { imageId: "img-123", reportCount: 1 },
    });
  });

  it("should return 500 on database error", async () => {
    vi.mocked(prisma.image.findUnique).mockRejectedValue(new Error("DB Error"));
    const req = makeRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Internal server error");
  });
});
