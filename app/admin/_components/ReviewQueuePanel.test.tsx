// @vitest-environment happy-dom
// Tests for the ReviewQueuePanel tinder-style review component.

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import ReviewQueuePanel from "./ReviewQueuePanel";
import type { StagingImage } from "./staging-types";

const BASE_ADMIN = {
  make: "Toyota",
  model: "Supra",
  year: 1994,
  trim: null,
  bodyStyle: "coupe",
  rarity: "uncommon",
  era: "retro",
  regionSlug: "japan",
  countryOfOrigin: "Japan",
  categories: [],
  isHardcoreEligible: false,
  notes: null,
  copyrightHolder: null,
  isCropped: false,
  isLogoVisible: false,
  isModelNameVisible: false,
  hasMultipleVehicles: false,
  isFaceVisible: false,
  isVehicleUnmodified: true,
};

const BASE_AGREEMENTS = {
  make: { value: null, count: 0, confirmed: false },
  model: { value: null, count: 0, confirmed: false },
  year: { value: null, count: 0, confirmed: false },
  trim: { value: null, count: 0, confirmed: false },
};

function makeImage(overrides: Partial<StagingImage> = {}): StagingImage {
  return {
    id: "img-1",
    imageUrl: "https://example.com/img1.jpg",
    filename: "cars/img1",
    status: "PENDING_REVIEW",
    createdAt: "2024-01-01T00:00:00Z",
    ai: { make: "Toyota", model: "Supra", year: 1994, bodyStyle: "coupe", confidence: 0.87 },
    admin: { ...BASE_ADMIN },
    confirmed: { make: null, model: null, year: null, trim: null },
    agreements: { ...BASE_AGREEMENTS },
    suggestionCount: 0,
    ...overrides,
  };
}

const IMAGE_1 = makeImage({ id: "img-1", filename: "cars/img1" });
const IMAGE_2 = makeImage({ id: "img-2", filename: "cars/img2", imageUrl: "https://example.com/img2.jpg" });
const INCOMPLETE_IMAGE = makeImage({
  id: "img-incomplete",
  ai: { make: null, model: null, year: null, bodyStyle: null, confidence: null },
  admin: {
    ...BASE_ADMIN,
    make: null,
    model: null,
    year: null,
    regionSlug: null,
    countryOfOrigin: null,
  },
});

function defaultFetchImpl(url: string, init?: RequestInit): Promise<Response> {
  if (url === "/api/admin/staging?status=PENDING_REVIEW") {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ items: [IMAGE_1, IMAGE_2], counts: { PENDING_REVIEW: 2 } }),
    } as Response);
  }
  if (url.startsWith("/api/admin/autocomplete?field=make")) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(["Toyota", "Honda"]) } as Response);
  }
  if (url.startsWith("/api/admin/autocomplete?field=model")) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(["Supra", "Civic"]) } as Response);
  }
  if (url.startsWith("/api/admin/autocomplete?field=trim")) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
  }
  if (url.startsWith("/api/admin/autocomplete?field=country")) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(["Japan", "USA"]) } as Response);
  }
  if (url.startsWith("/api/admin/autocomplete?field=copyright_holder")) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(["Wikimedia"]) } as Response);
  }
  if (url.startsWith("/api/admin/autocomplete?field=make_defaults")) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
  }
  if (url === "/api/filters") {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ regions: [{ slug: "japan" }, { slug: "usa" }] }),
    } as Response);
  }
  if (url === "/api/admin/categories") {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([{ slug: "sports", label: "Sports" }]),
    } as Response);
  }
  if (url.startsWith("/api/admin/staging/") && url.endsWith("/publish") && init?.method === "POST") {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ vehicleId: "v-1", imageId: "i-1" }) } as Response);
  }
  if (url.startsWith("/api/admin/staging/") && init?.method === "PUT") {
    const id = url.split("/api/admin/staging/")[1];
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...IMAGE_1, id }) } as Response);
  }
  return Promise.reject(new Error(`Unexpected fetch: ${url}`));
}

beforeEach(() => {
  global.fetch = vi.fn().mockImplementation(defaultFetchImpl);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ReviewQueuePanel", () => {
  it("renders the first card after loading", async () => {
    render(<ReviewQueuePanel />);
    await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
    expect(screen.getByAltText("cars/img1")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("← advances index without calling the staging API", async () => {
    render(<ReviewQueuePanel />);
    await waitFor(() => expect(screen.getByAltText("cars/img1")).toBeInTheDocument());

    const fetchSpy = vi.spyOn(global, "fetch");
    fireEvent.click(screen.getByRole("button", { name: /← Skip/i }));

    await waitFor(() => expect(screen.getByAltText("cars/img2")).toBeInTheDocument());

    // No staging API calls should have been made on skip
    const stagingCalls = fetchSpy.mock.calls.filter(
      ([url]) => typeof url === "string" && url.startsWith("/api/admin/staging/")
    );
    expect(stagingCalls).toHaveLength(0);
  });

  it("→ calls PUT and POST then advances to the next card", async () => {
    render(<ReviewQueuePanel />);
    await waitFor(() => expect(screen.getByAltText("cars/img1")).toBeInTheDocument());
    // Wait for form to sync (avoiding race condition where Publish is clicked before form is populated)
    await waitFor(() => expect(screen.getByDisplayValue("Toyota")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Publish & Next/i }));

    // Optimistic advance — second card should appear immediately
    await waitFor(() => expect(screen.getByAltText("cars/img2")).toBeInTheDocument());

    // Both PUT and POST should have been called for img-1
    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map((args) => args[0] as string);
      expect(calls).toContain("/api/admin/staging/img-1");
      expect(calls).toContain("/api/admin/staging/img-1/publish");
    });
  });

  it("blocks → and shows field errors when required fields are missing", async () => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (url === "/api/admin/staging?status=PENDING_REVIEW") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [INCOMPLETE_IMAGE], counts: { PENDING_REVIEW: 1 } }),
        } as Response);
      }
      return defaultFetchImpl(url as string);
    });

    render(<ReviewQueuePanel />);
    await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());

    const fetchSpy = vi.spyOn(global, "fetch");
    fireEvent.click(screen.getByRole("button", { name: /Publish & Next/i }));

    // Should stay on the same card
    expect(screen.queryByText("All caught up")).not.toBeInTheDocument();

    // Should show error markers next to required field labels
    await waitFor(() => {
      // The compact layout renders a red * next to labels for required fields
      const errorMarkers = document.querySelectorAll("label span.text-red-500");
      expect(errorMarkers.length).toBeGreaterThan(0);
    });

    // No API calls should have been made
    const stagingCalls = fetchSpy.mock.calls.filter(
      ([url]) => typeof url === "string" && url.startsWith("/api/admin/staging/")
    );
    expect(stagingCalls).toHaveLength(0);
  });

  it("shows the all caught up state when the queue is exhausted", async () => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (url === "/api/admin/staging?status=PENDING_REVIEW") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [IMAGE_1], counts: { PENDING_REVIEW: 1 } }),
        } as Response);
      }
      return defaultFetchImpl(url as string);
    });

    render(<ReviewQueuePanel />);
    await waitFor(() => expect(screen.getByAltText("cars/img1")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /← Skip/i }));

    await waitFor(() => expect(screen.getByText("All caught up")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Refresh/i })).toBeInTheDocument();
  });
});
