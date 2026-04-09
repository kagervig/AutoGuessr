import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/identify/[id]/suggest/route";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    stagingImage: { findUnique: vi.fn(), update: vi.fn() },
    communityIdentification: { upsert: vi.fn(), findMany: vi.fn() },
  },
}));

const { prisma } = await import("@/app/lib/prisma");

const IMAGE_ID = "img-staging-1";

function makeRequest(body: object) {
  return new NextRequest(`http://localhost/api/identify/${IMAGE_ID}/suggest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams() {
  return { params: Promise.resolve({ id: IMAGE_ID }) };
}

function mockStagingImage(overrides: object = {}) {
  vi.mocked(prisma.stagingImage.findUnique).mockResolvedValue({
    id: IMAGE_ID,
    status: "COMMUNITY_REVIEW",
    ...overrides,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.communityIdentification.upsert).mockResolvedValue({} as never);
  vi.mocked(prisma.communityIdentification.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.stagingImage.update).mockResolvedValue({} as never);
});

describe("POST /api/identify/[id]/suggest", () => {
  it("should return 400 when username is missing", async () => {
    const res = await POST(makeRequest({ make: "Toyota" }), makeParams());
    expect(res.status).toBe(400);
  });

  it("should return 400 when username is blank", async () => {
    const res = await POST(makeRequest({ username: "  ", make: "Toyota" }), makeParams());
    expect(res.status).toBe(400);
  });

  it("should return 400 when no identification fields are provided", async () => {
    const res = await POST(makeRequest({ username: "user1" }), makeParams());
    expect(res.status).toBe(400);
  });

  it("should return 404 when the staging image does not exist", async () => {
    vi.mocked(prisma.stagingImage.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest({ username: "user1", make: "Toyota" }), makeParams());
    expect(res.status).toBe(404);
  });

  it("should return 400 when the image is not in COMMUNITY_REVIEW status", async () => {
    mockStagingImage({ status: "PENDING_REVIEW" });
    const res = await POST(makeRequest({ username: "user1", make: "Toyota" }), makeParams());
    expect(res.status).toBe(400);
  });

  it("should return agreements on a successful suggestion", async () => {
    mockStagingImage();
    vi.mocked(prisma.communityIdentification.findMany).mockResolvedValue([
      { suggestedMake: "Toyota", suggestedModel: null, suggestedYear: null, suggestedTrim: null },
    ] as never);

    const res = await POST(makeRequest({ username: "user1", make: "Toyota" }), makeParams());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.agreements.make.value).toBe("Toyota");
    expect(data.agreements.make.count).toBe(1);
  });

  it("should accept a suggestion with only year provided", async () => {
    mockStagingImage();
    const res = await POST(makeRequest({ username: "user1", year: 1993 }), makeParams());
    expect(res.status).toBe(200);
  });
});
