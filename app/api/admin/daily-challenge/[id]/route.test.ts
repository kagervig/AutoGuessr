// Tests for DELETE and PATCH /api/admin/daily-challenge/[id]
import { vi, describe, it, expect, beforeEach } from "vitest";
import { DELETE, PATCH } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    dailyChallenge: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    image: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/app/lib/daily-challenge", () => ({
  pickImageIdsForChallenge: vi.fn(),
}));

vi.mock("@/app/lib/game", () => ({
  imageUrl: (filename: string, vehicleId: string) => `https://cdn/${filename}?v=${vehicleId}`,
}));

import { prisma } from "@/app/lib/prisma";
import { pickImageIdsForChallenge } from "@/app/lib/daily-challenge";

const DB_CHALLENGE = { id: 1, date: new Date("2025-06-01"), imageIds: [], generatedAt: new Date() };

const CHALLENGE = {
  id: 1,
  date: new Date("2099-06-01T00:00:00.000Z"),
  imageIds: ["img-1", "img-2", "img-3"],
  isPublished: true,
  curatedBy: null,
  generatedAt: new Date("2099-05-31T12:00:00.000Z"),
};

const PAST_CHALLENGE = { ...CHALLENGE, date: new Date("2025-06-01T00:00:00.000Z") };

const NEW_IMAGE = {
  id: "img-new",
  filename: "cars/evo",
  isActive: true,
  vehicle: { id: "v-new", make: "Mitsubishi", model: "Lancer Evolution" },
};

const UPDATED_CHALLENGE = { ...CHALLENGE, imageIds: ["img-new", "img-2", "img-3"] };


const UPDATED_IMAGES = [
  { id: "img-new", filename: "cars/evo", vehicle: { id: "v-new", make: "Mitsubishi", model: "Lancer Evolution" } },
  { id: "img-2", filename: "cars/m3", vehicle: { id: "v-2", make: "BMW", model: "M3" } },
  { id: "img-3", filename: "cars/911", vehicle: { id: "v-3", make: "Porsche", model: "911" } },
];

function makeRequest(id: string, body?: object) {
  const req = new NextRequest(`http://localhost/api/admin/daily-challenge/${id}`, {
    method: body ? "PATCH" : "DELETE",
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
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

describe("PATCH /api/admin/daily-challenge/[id]", () => {
  beforeEach(() => {
    vi.mocked(prisma.dailyChallenge.findUnique).mockResolvedValue(CHALLENGE as never);
    vi.mocked(prisma.image.findUnique).mockResolvedValue(NEW_IMAGE as never);
    vi.mocked(prisma.dailyChallenge.update).mockResolvedValue(UPDATED_CHALLENGE as never);
    vi.mocked(prisma.image.findMany).mockResolvedValue(UPDATED_IMAGES as never);
    vi.mocked(pickImageIdsForChallenge).mockResolvedValue(["img-new"]);
  });

  it("replaces the correct slot when withImageId is provided", async () => {
    const { req, params } = makeRequest("1", { replaceImageId: "img-1", withImageId: "img-new" });
    await PATCH(req, { params });
    expect(vi.mocked(prisma.dailyChallenge.update)).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { imageIds: ["img-new", "img-2", "img-3"] },
    });
  });

  it("calls pickImageIdsForChallenge when withImageId is omitted", async () => {
    const { req, params } = makeRequest("1", { replaceImageId: "img-1" });
    await PATCH(req, { params });
    expect(vi.mocked(pickImageIdsForChallenge)).toHaveBeenCalledWith(1, ["img-1", "img-2", "img-3"]);
    expect(vi.mocked(prisma.dailyChallenge.update)).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { imageIds: ["img-new", "img-2", "img-3"] },
    });
  });

  it("returns updated challenge with image details", async () => {
    const { req, params } = makeRequest("1", { replaceImageId: "img-1", withImageId: "img-new" });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.date).toBe("2099-06-01");
    expect(body.imageIds).toEqual(["img-new", "img-2", "img-3"]);
    expect(body.images[0]).toMatchObject({ id: "img-new", make: "Mitsubishi", model: "Lancer Evolution" });
  });

  it("returns 400 when replaceImageId is not in the challenge", async () => {
    const { req, params } = makeRequest("1", { replaceImageId: "img-missing", withImageId: "img-new" });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/not in challenge/i);
  });

  it("returns 400 when withImageId image is inactive", async () => {
    vi.mocked(prisma.image.findUnique).mockResolvedValue({ ...NEW_IMAGE, isActive: false } as never);
    const { req, params } = makeRequest("1", { replaceImageId: "img-1", withImageId: "img-new" });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/inactive/i);
  });

  it("returns 400 when withImageId is not found", async () => {
    vi.mocked(prisma.image.findUnique).mockResolvedValue(null);
    const { req, params } = makeRequest("1", { replaceImageId: "img-1", withImageId: "img-ghost" });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/not found|inactive/i);
  });

  it("returns 400 when withImageId is already in the challenge", async () => {
    vi.mocked(prisma.image.findUnique).mockResolvedValue({ ...NEW_IMAGE, id: "img-2", isActive: true } as never);
    const { req, params } = makeRequest("1", { replaceImageId: "img-1", withImageId: "img-2" });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/already in challenge/i);
  });

  it("returns 404 when challenge is not found", async () => {
    vi.mocked(prisma.dailyChallenge.findUnique).mockResolvedValue(null);
    const { req, params } = makeRequest("99", { replaceImageId: "img-1" });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(404);
  });

  it("returns 400 when id is not a number", async () => {
    const { req, params } = makeRequest("abc", { replaceImageId: "img-1" });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(400);
  });

  it("returns 400 when replaceImageId is missing", async () => {
    const { req, params } = makeRequest("1", {});
    const res = await PATCH(req, { params });
    expect(res.status).toBe(400);
  });

  it("returns 403 when the challenge date is in the past", async () => {
    vi.mocked(prisma.dailyChallenge.findUnique).mockResolvedValue(PAST_CHALLENGE as never);
    const { req, params } = makeRequest("1", { replaceImageId: "img-1" });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/past/i);
  });
});
