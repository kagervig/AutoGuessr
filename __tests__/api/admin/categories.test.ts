import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/admin/categories/route";
import { PUT, DELETE } from "@/app/api/admin/categories/[id]/route";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const { prisma } = await import("@/app/lib/prisma");

function makeRequest(method: string, body?: object) {
  return new Request("http://localhost/api/admin/categories", {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeIdParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin/categories", () => {
  it("should return all categories with vehicle counts", async () => {
    vi.mocked(prisma.category.findMany).mockResolvedValue([
      { id: "c-1", slug: "sports", label: "Sports", _count: { vehicles: 42 } },
    ] as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data[0]).toEqual({ id: "c-1", slug: "sports", label: "Sports", vehicleCount: 42 });
  });
});

describe("POST /api/admin/categories", () => {
  it("should return 400 when slug is missing", async () => {
    const res = await POST(makeRequest("POST", { label: "Sports" }));
    expect(res.status).toBe(400);
  });

  it("should return 400 when label is missing", async () => {
    const res = await POST(makeRequest("POST", { slug: "sports" }));
    expect(res.status).toBe(400);
  });

  it("should return 409 when a category with that slug already exists", async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue({ id: "c-1" } as never);
    const res = await POST(makeRequest("POST", { slug: "sports", label: "Sports" }));
    expect(res.status).toBe(409);
  });

  it("should create and return the category with status 201", async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.category.create).mockResolvedValue({ id: "c-2", slug: "muscle", label: "Muscle" } as never);

    const res = await POST(makeRequest("POST", { slug: "muscle", label: "Muscle" }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.slug).toBe("muscle");
    expect(data.vehicleCount).toBe(0);
  });
});

describe("PUT /api/admin/categories/[id]", () => {
  it("should return 400 when label is missing", async () => {
    const res = await PUT(makeRequest("PUT", {}), makeIdParams("c-1"));
    expect(res.status).toBe(400);
  });

  it("should update and return the category", async () => {
    vi.mocked(prisma.category.update).mockResolvedValue({ id: "c-1", slug: "sports", label: "Updated Sports" } as never);

    const res = await PUT(makeRequest("PUT", { label: "Updated Sports" }), makeIdParams("c-1"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.label).toBe("Updated Sports");
  });
});

describe("DELETE /api/admin/categories/[id]", () => {
  it("should return 404 when category does not exist", async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), makeIdParams("c-99"));
    expect(res.status).toBe(404);
  });

  it("should return 409 when vehicles are using the category", async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue({
      id: "c-1",
      _count: { vehicles: 5 },
    } as never);
    const res = await DELETE(makeRequest("DELETE"), makeIdParams("c-1"));
    expect(res.status).toBe(409);
  });

  it("should delete the category and return 204", async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue({
      id: "c-1",
      _count: { vehicles: 0 },
    } as never);
    vi.mocked(prisma.category.delete).mockResolvedValue({} as never);

    const res = await DELETE(makeRequest("DELETE"), makeIdParams("c-1"));
    expect(res.status).toBe(204);
  });
});
