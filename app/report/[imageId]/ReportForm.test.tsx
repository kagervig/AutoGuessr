// @vitest-environment happy-dom
// Tests for ReportForm returnTo navigation behaviour.
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ReportForm from "./ReportForm";

const mockRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

const imageData = {
  id: "img-abc",
  filename: "car.jpg",
  vehicleId: "v1",
  vehicle: {
    make: "Toyota",
    model: "Supra",
    year: 1994,
    trim: "Turbo",
    countryOfOrigin: "JP",
    bodyStyle: "coupe",
    era: "modern",
    rarity: "rare",
  },
};

function mockFetch(submitOk = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.includes("/api/images/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(imageData),
        });
      }
      return Promise.resolve({
        ok: submitOk,
        json: () => Promise.resolve(submitOk ? { success: true, deactivated: false } : { error: "Server error" }),
      });
    }),
  );
}

async function fillAndSubmit() {
  // Wait for the form to load by waiting for the comment textarea
  const comment = await screen.findByPlaceholderText("Additional comments (optional)");
  await userEvent.type(comment, "Wrong car");
  await userEvent.click(screen.getByRole("button", { name: /submit report/i }));
}

describe("ReportForm", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockFetch();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    mockRouterPush.mockReset();
  });

  it("shows thank-you message after submit", async () => {
    render(<ReportForm imageId="img-abc" />);
    await fillAndSubmit();

    await screen.findByText(/thank you/i);
  });

  it("navigates to returnTo after submit when returnTo is provided", async () => {
    render(<ReportForm imageId="img-abc" returnTo="/results?gameId=xyz&mode=easy" />);
    await fillAndSubmit();

    await screen.findByText(/thank you/i);

    await act(async () => {
      vi.advanceTimersByTime(1600);
    });

    expect(mockRouterPush).toHaveBeenCalledWith("/results?gameId=xyz&mode=easy");
  });

  it("does not navigate when returnTo is not provided", async () => {
    render(<ReportForm imageId="img-abc" />);
    await fillAndSubmit();

    await screen.findByText(/thank you/i);

    await act(async () => {
      vi.advanceTimersByTime(1600);
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
