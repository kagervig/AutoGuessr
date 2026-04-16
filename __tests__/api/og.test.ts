import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor() {
      return new Response("img", {
        status: 200,
        headers: { "Content-Type": "image/png" },
      });
    }
  },
}));

// Prevent real network calls from loadOutfitFont
vi.stubGlobal(
  "fetch",
  vi.fn().mockResolvedValue({ text: async () => "", arrayBuffer: async () => new ArrayBuffer(0) }),
);

const { GET } = await import("@/app/api/og/route");

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/og");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/og", () => {
  it("should return 400 when score and grade are missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
  });

  it("should return 400 when score is missing but other params are present", async () => {
    const res = await GET(makeRequest({ percentage: "75", mode: "Standard" }));
    expect(res.status).toBe(400);
  });

  it("should return 200 with score and grade params", async () => {
    const res = await GET(makeRequest({ score: "12500", grade: "A", mode: "Standard" }));
    expect(res.status).toBe(200);
  });

  it("should return 200 with score and grade only", async () => {
    const res = await GET(makeRequest({ score: "5000", grade: "B" }));
    expect(res.status).toBe(200);
  });
});
