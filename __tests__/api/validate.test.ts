import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/validate/route";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    vehicle: { findUnique: vi.fn() },
  },
}));

const { prisma } = await import("@/app/lib/prisma");

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockVehicle(overrides: object = {}) {
  vi.mocked(prisma.vehicle.findUnique).mockResolvedValue({
    id: "v-1",
    make: "Toyota",
    model: "Supra",
    year: 1993,
    aliases: [],
    ...overrides,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/validate", () => {
  it("should return 400 when vehicleId is missing", async () => {
    const res = await POST(makeRequest({ guessedMake: "Toyota", guessedModel: "Supra" }));
    expect(res.status).toBe(400);
  });

  it("should return 400 when guessedMake is missing", async () => {
    const res = await POST(makeRequest({ vehicleId: "v-1", guessedModel: "Supra" }));
    expect(res.status).toBe(400);
  });

  it("should return 400 when guessedModel is missing", async () => {
    const res = await POST(makeRequest({ vehicleId: "v-1", guessedMake: "Toyota" }));
    expect(res.status).toBe(400);
  });

  it("should return 404 when vehicle is not found", async () => {
    vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest({ vehicleId: "missing", guessedMake: "Toyota", guessedModel: "Supra" }));
    expect(res.status).toBe(404);
  });

  it("should return makeMatch=true and modelMatch=true for an exact match", async () => {
    mockVehicle();
    const res = await POST(makeRequest({ vehicleId: "v-1", guessedMake: "Toyota", guessedModel: "Supra" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.makeMatch).toBe(true);
    expect(data.modelMatch).toBe(true);
    expect(data.partialCredit).toBe(2);
  });

  it("should return makeMatch=true and modelMatch=false for a wrong model", async () => {
    mockVehicle();
    const res = await POST(makeRequest({ vehicleId: "v-1", guessedMake: "Toyota", guessedModel: "Camry" }));
    const data = await res.json();
    expect(data.makeMatch).toBe(true);
    expect(data.modelMatch).toBe(false);
    expect(data.partialCredit).toBe(1);
  });

  it("should return makeMatch=false and partialCredit=0 for a wrong make", async () => {
    mockVehicle();
    const res = await POST(makeRequest({ vehicleId: "v-1", guessedMake: "Honda", guessedModel: "Supra" }));
    const data = await res.json();
    expect(data.makeMatch).toBe(false);
    expect(data.partialCredit).toBe(0);
  });

  it("should return yearDelta when guessedYear is provided", async () => {
    mockVehicle();
    const res = await POST(makeRequest({ vehicleId: "v-1", guessedMake: "Toyota", guessedModel: "Supra", guessedYear: 1995 }));
    const data = await res.json();
    expect(data.yearDelta).toBe(2);
  });

  it("should return yearDelta=null when guessedYear is omitted", async () => {
    mockVehicle();
    const res = await POST(makeRequest({ vehicleId: "v-1", guessedMake: "Toyota", guessedModel: "Supra" }));
    const data = await res.json();
    expect(data.yearDelta).toBeNull();
  });

  it("should match via alias", async () => {
    mockVehicle({
      make: "Toyota",
      model: "Supra",
      aliases: [{ alias: "MkIV", aliasType: "nickname" }],
    });
    const res = await POST(makeRequest({ vehicleId: "v-1", guessedMake: "Toyota", guessedModel: "MkIV" }));
    const data = await res.json();
    expect(data.modelMatch).toBe(true);
  });
});
