import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/identify/route";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    stagingImage: { findMany: vi.fn() },
  },
}));

vi.mock("@/app/lib/game", () => ({
  imageUrl: vi.fn((_filename: string, id: string) => `https://cdn.example.com/${id}`),
}));

const { prisma } = await import("@/app/lib/prisma");

function makeStagingImage(overrides: object = {}) {
  return {
    id: "img-1",
    cloudinaryPublicId: "some/path.jpg",
    status: "COMMUNITY_REVIEW",
    aiMake: "Toyota",
    aiModel: "Supra",
    aiYear: 1993,
    suggestions: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/identify", () => {
  it("should return images with their agreement data", async () => {
    vi.mocked(prisma.stagingImage.findMany).mockResolvedValue([
      makeStagingImage(),
    ] as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("img-1");
    expect(data[0].agreements).toBeDefined();
  });

  it("should return an empty array when no images are in community review", async () => {
    vi.mocked(prisma.stagingImage.findMany).mockResolvedValue([] as never);

    const res = await GET();
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it("should filter out suggestions with 5 or more downvotes", async () => {
    vi.mocked(prisma.stagingImage.findMany).mockResolvedValue([
      makeStagingImage({
        suggestions: [
          { id: "s-1", username: "user1", suggestedMake: "Honda", suggestedModel: null, suggestedYear: null, suggestedTrim: null, upvotes: 0, downvotes: 5 },
          { id: "s-2", username: "user2", suggestedMake: "Toyota", suggestedModel: null, suggestedYear: null, suggestedTrim: null, upvotes: 3, downvotes: 1 },
        ],
      }),
    ] as never);

    const res = await GET();
    const data = await res.json();
    const suggestions = data[0].suggestions;
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].id).toBe("s-2");
  });

  it("should sort suggestions by netVotes descending", async () => {
    vi.mocked(prisma.stagingImage.findMany).mockResolvedValue([
      makeStagingImage({
        suggestions: [
          { id: "s-1", username: "u1", suggestedMake: "Honda", suggestedModel: null, suggestedYear: null, suggestedTrim: null, upvotes: 1, downvotes: 0 },
          { id: "s-2", username: "u2", suggestedMake: "Toyota", suggestedModel: null, suggestedYear: null, suggestedTrim: null, upvotes: 5, downvotes: 1 },
        ],
      }),
    ] as never);

    const res = await GET();
    const data = await res.json();
    expect(data[0].suggestions[0].id).toBe("s-2"); // netVotes = 4
    expect(data[0].suggestions[1].id).toBe("s-1"); // netVotes = 1
  });

  it("should include ai predictions in the response", async () => {
    vi.mocked(prisma.stagingImage.findMany).mockResolvedValue([
      makeStagingImage({ aiMake: "BMW", aiModel: "M3", aiYear: 2001 }),
    ] as never);

    const res = await GET();
    const data = await res.json();
    expect(data[0].ai).toEqual({ make: "BMW", model: "M3", year: 2001 });
  });
});
