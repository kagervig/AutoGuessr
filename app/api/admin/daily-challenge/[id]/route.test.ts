// Tests for DELETE /api/admin/daily-challenge/[id]
import { vi, describe, it, expect, beforeEach } from "vitest";
import { DELETE } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    dailyChallenge: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/app/lib/prisma";

const DB_CHALLENGE = { id: 1, date: new Date("2025-06-01"), imageIds: [], generatedAt: new Date() };

function makeRequest(id: string) {
  const req = new NextRequest(`http://localhost/api/admin/daily-challenge/${id}`);
  return { req, params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.mocked(prisma.dailyChallenge.findUnique).mockResolvedValue(DB_CHALLENGE as never);
  vi.mocked(prisma.dailyChallenge.delete).mockResolvedValue(DB_CHALLENGE as never);
});

describe("DELETE /api/admin/daily-challenge/[id]", () => {
  it("returns 204 on successful delete", async () => {
    const { req, params } = makeRequest("1");
    const res = await DELETE(req, { params });
    expect(res.status).toBe(204);
  });

  it("deletes the challenge with the correct id", async () => {
    const { req, params } = makeRequest("1");
    await DELETE(req, { params });
    expect(vi.mocked(prisma.dailyChallenge.delete)).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("returns 400 when id is not a number", async () => {
    const { req, params } = makeRequest("abc");
    const res = await DELETE(req, { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid id");
  });

  it("returns 404 when challenge does not exist", async () => {
    vi.mocked(prisma.dailyChallenge.findUnique).mockResolvedValue(null);
    const { req, params } = makeRequest("99");
    const res = await DELETE(req, { params });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Not found");
  });

  it("returns 500 on database error during delete", async () => {
    vi.mocked(prisma.dailyChallenge.delete).mockRejectedValue(new Error("db down"));
    const { req, params } = makeRequest("1");
    const res = await DELETE(req, { params });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("db down");
  });
});
