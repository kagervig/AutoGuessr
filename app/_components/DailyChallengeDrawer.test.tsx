// @vitest-environment happy-dom
// Tests for DailyChallengeDrawer — per-round result panel for a completed challenge day.
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const SUMMARY = {
  totalScore: 8500,
  rounds: [
    {
      roundIndex: 0,
      imageUrl: "https://img.test/car1.jpg",
      correctVehicleLabel: "Toyota Supra",
      guessedVehicleLabel: "Toyota Supra",
      roundScore: 4500,
      bonuses: [],
    },
    {
      roundIndex: 1,
      imageUrl: "https://img.test/car2.jpg",
      correctVehicleLabel: "Honda NSX",
      guessedVehicleLabel: "Honda Civic",
      roundScore: 0,
      bonuses: [],
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ json: () => Promise.resolve(SUMMARY) }),
  );
});

import { DailyChallengeDrawer } from "./DailyChallengeDrawer";

const BASE_PROPS = {
  dateStr: "2026-06-01",
  day: 1,
  monthName: "June",
  score: 8500,
  rank: 12,
  totalPlayers: 200,
  grade: "B",
  gradeColor: "#60a5fa",
  playerId: "player-1",
  onClose: vi.fn(),
};

describe("DailyChallengeDrawer", () => {
  it("shows grade, score, and rank", () => {
    render(<DailyChallengeDrawer {...BASE_PROPS} />);
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("8,500")).toBeInTheDocument();
    expect(screen.getByText("#12")).toBeInTheDocument();
  });

  it("shows per-round results after summary loads", async () => {
    render(<DailyChallengeDrawer {...BASE_PROPS} />);
    await waitFor(() => expect(screen.getAllByText("Toyota Supra").length).toBeGreaterThan(0));
    expect(screen.getByText("Honda NSX")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const onClose = vi.fn();
    render(<DailyChallengeDrawer {...BASE_PROPS} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("fetches summary with the correct date and playerId", () => {
    render(<DailyChallengeDrawer {...BASE_PROPS} />);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("/api/daily-challenge/2026-06-01/summary"),
      expect.any(Object),
    );
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("playerId=player-1"),
      expect.any(Object),
    );
  });
});
