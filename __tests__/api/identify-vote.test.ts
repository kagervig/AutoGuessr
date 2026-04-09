import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/identify/[id]/vote/route";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    stagingImage: { findUnique: vi.fn() },
    communityIdentification: { findUnique: vi.fn(), update: vi.fn() },
    communityVote: { upsert: vi.fn(), findMany: vi.fn() },
  },
}));

const { prisma } = await import("@/app/lib/prisma");

const IMAGE_ID = "img-1";
const SUGGESTION_ID = "sug-1";

function makeRequest(body: object) {
  return new NextRequest(`http://localhost/api/identify/${IMAGE_ID}/vote`, {
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

function mockSuggestion(overrides: object = {}) {
  vi.mocked(prisma.communityIdentification.findUnique).mockResolvedValue({
    id: SUGGESTION_ID,
    stagingImageId: IMAGE_ID,
    username: "author",
    ...overrides,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.communityVote.upsert).mockResolvedValue({} as never);
  vi.mocked(prisma.communityVote.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.communityIdentification.update).mockResolvedValue({} as never);
});

describe("POST /api/identify/[id]/vote", () => {
  it("should return 400 when username is missing", async () => {
    const res = await POST(makeRequest({ suggestionId: SUGGESTION_ID, isUpvote: true }), makeParams());
    expect(res.status).toBe(400);
  });

  it("should return 400 when isUpvote is not a boolean", async () => {
    const res = await POST(makeRequest({ suggestionId: SUGGESTION_ID, username: "voter", isUpvote: "yes" }), makeParams());
    expect(res.status).toBe(400);
  });

  it("should return 400 when suggestionId is missing", async () => {
    const res = await POST(makeRequest({ username: "voter", isUpvote: true }), makeParams());
    expect(res.status).toBe(400);
  });

  it("should return 404 when the staging image does not exist", async () => {
    vi.mocked(prisma.stagingImage.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest({ suggestionId: SUGGESTION_ID, username: "voter", isUpvote: true }), makeParams());
    expect(res.status).toBe(404);
  });

  it("should return 400 when the image is not in COMMUNITY_REVIEW status", async () => {
    mockStagingImage({ status: "PUBLISHED" });
    const res = await POST(makeRequest({ suggestionId: SUGGESTION_ID, username: "voter", isUpvote: true }), makeParams());
    expect(res.status).toBe(400);
  });

  it("should return 404 when the suggestion does not exist", async () => {
    mockStagingImage();
    vi.mocked(prisma.communityIdentification.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest({ suggestionId: SUGGESTION_ID, username: "voter", isUpvote: true }), makeParams());
    expect(res.status).toBe(404);
  });

  it("should return 404 when the suggestion belongs to a different image", async () => {
    mockStagingImage();
    mockSuggestion({ stagingImageId: "other-img" });
    const res = await POST(makeRequest({ suggestionId: SUGGESTION_ID, username: "voter", isUpvote: true }), makeParams());
    expect(res.status).toBe(404);
  });

  it("should return 400 when the voter is the suggestion author", async () => {
    mockStagingImage();
    mockSuggestion({ username: "voter" });
    const res = await POST(makeRequest({ suggestionId: SUGGESTION_ID, username: "voter", isUpvote: true }), makeParams());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/own suggestion/i);
  });

  it("should return upvote/downvote counts on success", async () => {
    mockStagingImage();
    mockSuggestion();
    vi.mocked(prisma.communityVote.findMany).mockResolvedValue([
      { isUpvote: true },
      { isUpvote: true },
      { isUpvote: false },
    ] as never);

    const res = await POST(makeRequest({ suggestionId: SUGGESTION_ID, username: "voter", isUpvote: true }), makeParams());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.upvotes).toBe(2);
    expect(data.downvotes).toBe(1);
    expect(data.netVotes).toBe(1);
  });
});
