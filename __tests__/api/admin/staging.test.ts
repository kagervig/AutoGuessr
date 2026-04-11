import { describe, it, expect, vi, beforeEach } from "vitest";
import { PUT } from "@/app/api/admin/staging/[id]/route";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock("@/app/lib/game", () => ({
  imageUrl: vi.fn(() => "https://cdn.example.com/test.jpg"),
}));

const { prisma } = await import("@/app/lib/prisma");

const STAGING_ID = "staging-1";
const CLOUDINARY_ID = "cars/toyota-supra";

const FAKE_STAGING = {
  id: STAGING_ID,
  cloudinaryPublicId: CLOUDINARY_ID,
  status: "REJECTED",
  adminMake: "Toyota",
  adminModel: "Supra",
  adminYear: 1993,
  adminTrim: null,
  adminBodyStyle: null,
  adminRarity: null,
  adminEra: null,
  adminRegionSlug: null,
  adminCountryOfOrigin: null,
  adminCategories: [],
  adminIsHardcoreEligible: false,
  adminNotes: null,
  adminCopyrightHolder: null,
  adminIsCropped: false,
  adminIsLogoVisible: false,
  adminIsModelNameVisible: false,
  adminHasMultipleVehicles: false,
  adminIsFaceVisible: false,
  adminIsVehicleUnmodified: true,
  confirmedMake: null,
  confirmedModel: null,
  confirmedYear: null,
  confirmedTrim: null,
  suggestions: [],
};

function makeRequest(body: object) {
  return new Request(`http://localhost/api/admin/staging/${STAGING_ID}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeIdParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PUT /api/admin/staging/[id] — rejection", () => {
  it("should deactivate the published image when status is set to REJECTED", async () => {
    const txStagingUpdate = vi.fn().mockResolvedValue(FAKE_STAGING);
    const txImageUpdateMany = vi.fn().mockResolvedValue({ count: 1 });

    vi.mocked(prisma.$transaction).mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          stagingImage: { update: txStagingUpdate },
          image: { updateMany: txImageUpdateMany },
        })
    );

    const res = await PUT(makeRequest({ status: "REJECTED" }) as never, makeIdParams(STAGING_ID));

    expect(res.status).toBe(200);
    expect(txImageUpdateMany).toHaveBeenCalledWith({
      where: { filename: CLOUDINARY_ID },
      data: { isActive: false },
    });
  });

  it("should not touch any image when status is not REJECTED", async () => {
    const txStagingUpdate = vi.fn().mockResolvedValue({ ...FAKE_STAGING, status: "READY" });
    const txImageUpdateMany = vi.fn();

    vi.mocked(prisma.$transaction).mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          stagingImage: { update: txStagingUpdate },
          image: { updateMany: txImageUpdateMany },
        })
    );

    await PUT(makeRequest({ status: "READY" }) as never, makeIdParams(STAGING_ID));

    expect(txImageUpdateMany).not.toHaveBeenCalled();
  });
});
