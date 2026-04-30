// Tests for POST /api/admin/daily-challenge/generate
import { vi, describe, it, expect, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/app/lib/daily-challenge", () => ({
  generateChallengesForRange: vi.fn(),
}));

import { generateChallengesForRange } from "@/app/lib/daily-challenge";

const GENERATE_RESULT = { created: [{ id: 1 }], skipped: [] };

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/daily-challenge/generate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.mocked(generateChallengesForRange).mockResolvedValue(GENERATE_RESULT as never);
});

describe("POST /api/admin/daily-challenge/generate", () => {
  it("returns 201 with result on success", async () => {
    const res = await POST(makeRequest({ startDate: "2025-06-01", endDate: "2025-06-07" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual(GENERATE_RESULT);
  });

  it("calls generateChallengesForRange with UTC midnight dates", async () => {
    await POST(makeRequest({ startDate: "2025-06-01", endDate: "2025-06-07" }));
    expect(vi.mocked(generateChallengesForRange)).toHaveBeenCalledWith(
      new Date("2025-06-01T00:00:00.000Z"),
      new Date("2025-06-07T00:00:00.000Z")
    );
  });

  it("returns 400 when startDate is missing", async () => {
    const res = await POST(makeRequest({ endDate: "2025-06-07" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/startDate/);
  });

  it("returns 400 when endDate is missing", async () => {
    const res = await POST(makeRequest({ startDate: "2025-06-01" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/endDate/);
  });

  it("returns 400 when startDate has wrong format", async () => {
    const res = await POST(makeRequest({ startDate: "01/06/2025", endDate: "2025-06-07" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/YYYY-MM-DD/);
  });

  it("returns 400 when endDate is before startDate", async () => {
    const res = await POST(makeRequest({ startDate: "2025-06-07", endDate: "2025-06-01" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/endDate/);
  });

  it("returns 500 on generation error", async () => {
    vi.mocked(generateChallengesForRange).mockRejectedValue(new Error("not enough images"));
    const res = await POST(makeRequest({ startDate: "2025-06-01", endDate: "2025-06-01" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("not enough images");
  });
});
