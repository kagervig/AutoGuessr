// @vitest-environment happy-dom
// Tests for the ImagesPanel admin component.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import ImagesPanel from "./ImagesPanel";

const ACTIVE_IMAGE = {
  id: "img-1",
  imageUrl: "https://example.com/img1.jpg",
  filename: "cars/img1",
  isActive: true,
  isHardcoreEligible: false,
  copyrightHolder: "Wikimedia",
  isCropped: false,
  isLogoVisible: false,
  isModelNameVisible: false,
  hasMultipleVehicles: false,
  isFaceVisible: false,
  isVehicleUnmodified: true,
  uploadedAt: "2024-01-01T00:00:00Z",
  vehicle: {
    id: "v-1",
    make: "Toyota",
    model: "Supra",
    year: 1994,
    trim: null,
    bodyStyle: "coupe",
    era: "modern",
    rarity: "uncommon",
    countryOfOrigin: "Japan",
    regionSlug: "japan",
    categories: ["sports"],
  },
};

const INACTIVE_IMAGE = {
  id: "img-2",
  imageUrl: "https://example.com/img2.jpg",
  filename: "cars/img2",
  isActive: false,
  isHardcoreEligible: false,
  copyrightHolder: null,
  isCropped: false,
  isLogoVisible: false,
  isModelNameVisible: false,
  hasMultipleVehicles: false,
  isFaceVisible: false,
  isVehicleUnmodified: true,
  uploadedAt: "2024-01-02T00:00:00Z",
  vehicle: {
    id: "v-2",
    make: "Honda",
    model: "Civic",
    year: 1998,
    trim: "EK9",
    bodyStyle: "hatchback",
    era: "modern",
    rarity: "common",
    countryOfOrigin: "Japan",
    regionSlug: "japan",
    categories: [],
  },
};

function defaultFetchImpl(url: string, init?: RequestInit): Promise<Response> {
  if (url === "/api/admin/images") {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [ACTIVE_IMAGE, INACTIVE_IMAGE] }) } as Response);
  }
  if (url.startsWith("/api/admin/autocomplete?field=make")) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(["Toyota", "Honda"]) } as Response);
  }
  if (url.startsWith("/api/admin/autocomplete?field=model")) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(["Supra", "Civic"]) } as Response);
  }
  if (url.startsWith("/api/admin/autocomplete?field=country")) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(["Japan", "USA"]) } as Response);
  }
  if (url.startsWith("/api/admin/autocomplete?field=copyright_holder")) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(["Wikimedia"]) } as Response);
  }
  if (url === "/api/filters") {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ regions: [{ slug: "japan" }, { slug: "usa" }] }) } as Response);
  }
  if (url === "/api/admin/categories") {
    return Promise.resolve({ ok: true, json: () => Promise.resolve([{ slug: "sports", label: "Sports" }]) } as Response);
  }
  if (url.startsWith("/api/admin/images/") && init?.method === "PUT") {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...ACTIVE_IMAGE, vehicle: ACTIVE_IMAGE.vehicle }) } as Response);
  }
  return Promise.reject(new Error(`Unexpected fetch: ${url}`));
}

beforeEach(() => {
  global.fetch = vi.fn().mockImplementation(defaultFetchImpl);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ImagesPanel", () => {
  describe("loading and rendering", () => {
    it("shows loading state before images arrive", () => {
      render(<ImagesPanel />);
      expect(screen.getByText("Loading…")).toBeInTheDocument();
    });

    it("renders all images after loading", async () => {
      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      expect(screen.getByAltText("cars/img1")).toBeInTheDocument();
      expect(screen.getByAltText("cars/img2")).toBeInTheDocument();
    });

    it("shows Active badge for active images", async () => {
      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      expect(screen.getAllByText("Active")).toHaveLength(1);
    });

    it("shows Inactive badge for inactive images", async () => {
      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });

    it("shows make, model and year on each card", async () => {
      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      expect(screen.getByText("Toyota Supra")).toBeInTheDocument();
      expect(screen.getByText("Honda Civic")).toBeInTheDocument();
      expect(screen.getByText("1994")).toBeInTheDocument();
      expect(screen.getByText("1998")).toBeInTheDocument();
    });

    it("shows empty state when no images are returned", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url === "/api/admin/images") {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) } as Response);
        }
        return defaultFetchImpl(url);
      });
      render(<ImagesPanel />);
      await waitFor(() => expect(screen.getByText("No images.")).toBeInTheDocument());
    });
  });

  describe("filter tabs", () => {
    it("shows correct counts in all filter tabs", async () => {
      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      expect(screen.getByRole("button", { name: "All (2)" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Active (1)" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Inactive (1)" })).toBeInTheDocument();
    });

    it("shows only active images when Active filter is selected", async () => {
      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      await userEvent.click(screen.getByRole("button", { name: "Active (1)" }));
      expect(screen.getByAltText("cars/img1")).toBeInTheDocument();
      expect(screen.queryByAltText("cars/img2")).not.toBeInTheDocument();
    });

    it("shows only inactive images when Inactive filter is selected", async () => {
      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      await userEvent.click(screen.getByRole("button", { name: "Inactive (1)" }));
      expect(screen.queryByAltText("cars/img1")).not.toBeInTheDocument();
      expect(screen.getByAltText("cars/img2")).toBeInTheDocument();
    });

    it("restores all images when switching back to All", async () => {
      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      await userEvent.click(screen.getByRole("button", { name: "Inactive (1)" }));
      await userEvent.click(screen.getByRole("button", { name: "All (2)" }));
      expect(screen.getByAltText("cars/img1")).toBeInTheDocument();
      expect(screen.getByAltText("cars/img2")).toBeInTheDocument();
    });

    it("closes the detail panel when switching filter tabs", async () => {
      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      await userEvent.click(screen.getByAltText("cars/img1"));
      expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Active (1)" }));
      expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
    });
  });

  describe("detail panel", () => {
    it("does not show the detail panel before an image is selected", async () => {
      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
    });

    it("opens the detail panel on image click", async () => {
      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      await userEvent.click(screen.getByAltText("cars/img1"));
      expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
    });

    it("populates form fields from the selected image's vehicle data", async () => {
      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      await userEvent.click(screen.getByAltText("cars/img1"));
      expect(screen.getByDisplayValue("Toyota")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Supra")).toBeInTheDocument();
      expect(screen.getByDisplayValue("1994")).toBeInTheDocument();
    });

    it("checks the Active checkbox when the selected image is active", async () => {
      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      await userEvent.click(screen.getByAltText("cars/img1"));
      expect(screen.getByRole("checkbox", { name: "Active" })).toBeChecked();
    });

    it("unchecks the Active checkbox when the selected image is inactive", async () => {
      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      await userEvent.click(screen.getByAltText("cars/img2"));
      expect(screen.getByRole("checkbox", { name: "Active" })).not.toBeChecked();
    });

    it("switches form data when a different image is clicked", async () => {
      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      await userEvent.click(screen.getByAltText("cars/img1"));
      expect(screen.getByDisplayValue("Toyota")).toBeInTheDocument();
      await userEvent.click(screen.getAllByAltText("cars/img2")[0]);
      expect(screen.getByDisplayValue("Honda")).toBeInTheDocument();
      expect(screen.queryByDisplayValue("Toyota")).not.toBeInTheDocument();
    });
  });

  describe("save changes", () => {
    it("sends a PUT request with the form data", async () => {
      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      await userEvent.click(screen.getByAltText("cars/img1"));
      await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const putCall = calls.find(([url, init]: [string, RequestInit]) =>
        url === "/api/admin/images/img-1" && init?.method === "PUT"
      );
      expect(putCall).toBeDefined();
      const body = JSON.parse(putCall[1].body as string);
      expect(body.make).toBe("Toyota");
      expect(body.model).toBe("Supra");
      expect(body.year).toBe("1994");
      expect(body.isActive).toBe(true);
    });

    it("shows saving state while the PUT request is in flight", async () => {
      let resolvePut!: () => void;
      const putPending = new Promise<void>((resolve) => { resolvePut = resolve; });

      global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url === "/api/admin/images/img-1" && init?.method === "PUT") {
          return putPending.then(() => ({ ok: true, json: () => Promise.resolve({ ...ACTIVE_IMAGE, vehicle: ACTIVE_IMAGE.vehicle }) }));
        }
        return defaultFetchImpl(url, init);
      });

      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      await userEvent.click(screen.getByAltText("cars/img1"));
      await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
      expect(screen.getByRole("button", { name: "Saving…" })).toBeInTheDocument();
      resolvePut();
    });

    it("updates the image card after a successful save", async () => {
      const updatedImage = { ...ACTIVE_IMAGE, isActive: false, vehicle: ACTIVE_IMAGE.vehicle };

      global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url === "/api/admin/images/img-1" && init?.method === "PUT") {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(updatedImage) } as Response);
        }
        return defaultFetchImpl(url, init);
      });

      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      await userEvent.click(screen.getByAltText("cars/img1"));
      await userEvent.click(screen.getByRole("checkbox", { name: "Active" }));
      await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
      await waitFor(() => expect(screen.getAllByText("Inactive")).toHaveLength(2));
    });

    it("shows an error message when the save request fails", async () => {
      global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url === "/api/admin/images/img-1" && init?.method === "PUT") {
          return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "Region not found" }) } as Response);
        }
        return defaultFetchImpl(url, init);
      });

      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      await userEvent.click(screen.getByAltText("cars/img1"));
      await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
      await waitFor(() => expect(screen.getByText("Region not found")).toBeInTheDocument());
    });

    it("clears a previous error when a new image is selected", async () => {
      global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url === "/api/admin/images/img-1" && init?.method === "PUT") {
          return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "Region not found" }) } as Response);
        }
        return defaultFetchImpl(url, init);
      });

      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      await userEvent.click(screen.getByAltText("cars/img1"));
      await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
      await waitFor(() => expect(screen.getByText("Region not found")).toBeInTheDocument());
      await userEvent.click(screen.getAllByAltText("cars/img2")[0]);
      expect(screen.queryByText("Region not found")).not.toBeInTheDocument();
    });
  });

  describe("deactivate", () => {
    it("shows Deactivate button only for active images", async () => {
      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      await userEvent.click(screen.getByAltText("cars/img1"));
      expect(screen.getByRole("button", { name: "Deactivate" })).toBeInTheDocument();
    });

    it("does not show Deactivate button for inactive images", async () => {
      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      await userEvent.click(screen.getByAltText("cars/img2"));
      expect(screen.queryByRole("button", { name: "Deactivate" })).not.toBeInTheDocument();
    });

    it("sends PUT with isActive false when Deactivate is clicked", async () => {
      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      await userEvent.click(screen.getByAltText("cars/img1"));
      await userEvent.click(screen.getByRole("button", { name: "Deactivate" }));

      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const putCall = calls.find(([url, init]: [string, RequestInit]) =>
        url === "/api/admin/images/img-1" && init?.method === "PUT"
      );
      expect(putCall).toBeDefined();
      expect(JSON.parse(putCall[1].body as string)).toEqual({ isActive: false });
    });

    it("updates the image card to Inactive after deactivation", async () => {
      global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url === "/api/admin/images/img-1" && init?.method === "PUT") {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...ACTIVE_IMAGE, isActive: false, vehicle: ACTIVE_IMAGE.vehicle }) } as Response);
        }
        return defaultFetchImpl(url, init);
      });

      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      await userEvent.click(screen.getByAltText("cars/img1"));
      await userEvent.click(screen.getByRole("button", { name: "Deactivate" }));
      await waitFor(() => expect(screen.getAllByText("Inactive")).toHaveLength(2));
    });

    it("hides the Deactivate button after deactivation", async () => {
      global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url === "/api/admin/images/img-1" && init?.method === "PUT") {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...ACTIVE_IMAGE, isActive: false, vehicle: ACTIVE_IMAGE.vehicle }) } as Response);
        }
        return defaultFetchImpl(url, init);
      });

      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      await userEvent.click(screen.getByAltText("cars/img1"));
      await userEvent.click(screen.getByRole("button", { name: "Deactivate" }));
      await waitFor(() => expect(screen.queryByRole("button", { name: "Deactivate" })).not.toBeInTheDocument());
    });

    it("shows an error message when deactivation fails", async () => {
      global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url === "/api/admin/images/img-1" && init?.method === "PUT") {
          return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "Deactivate failed" }) } as Response);
        }
        return defaultFetchImpl(url, init);
      });

      render(<ImagesPanel />);
      await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
      await userEvent.click(screen.getByAltText("cars/img1"));
      await userEvent.click(screen.getByRole("button", { name: "Deactivate" }));
      await waitFor(() => expect(screen.getByText("Deactivate failed")).toBeInTheDocument());
    });
  });
});
