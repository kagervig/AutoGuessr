// @vitest-environment happy-dom
// Tests for ScoreSidebar: score stats and mode description card.
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ScoreSidebar } from "./ScoreSidebar";

// Tachometer is a complex animated SVG with framer-motion springs; stub it out.
vi.mock("@/app/components/ui/Tachometer", () => ({
  Tachometer: () => <div data-testid="tachometer" />,
}));

const baseProps = {
  mode: "standard",
  modeLabel: "Standard",
  score: 350,
  maxTotalScore: 1000,
  currentIndex: 1,
  totalRounds: 5,
};

describe("ScoreSidebar", () => {
  describe("score stats", () => {
    it("renders the tachometer", () => {
      render(<ScoreSidebar {...baseProps} />);
      expect(screen.getByTestId("tachometer")).toBeInTheDocument();
    });

    it("shows the current round as 1-indexed over total", () => {
      render(<ScoreSidebar {...baseProps} currentIndex={1} totalRounds={5} />);
      expect(screen.getByText("2 / 5")).toBeInTheDocument();
    });

    it("shows the total score", () => {
      render(<ScoreSidebar {...baseProps} score={350} />);
      expect(screen.getByText("350")).toBeInTheDocument();
    });

    it("shows the max possible score", () => {
      render(<ScoreSidebar {...baseProps} maxTotalScore={1000} />);
      expect(screen.getByText("1,000")).toBeInTheDocument();
    });
  });

  describe("mode info chip", () => {
    it("renders the mode label", () => {
      render(<ScoreSidebar {...baseProps} modeLabel="Hardcore" />);
      expect(screen.getByText("Hardcore")).toBeInTheDocument();
    });

    it("shows the description for standard mode", () => {
      render(<ScoreSidebar {...baseProps} mode="standard" />);
      expect(screen.getByText("Type make, model, and year.")).toBeInTheDocument();
    });

    it("shows the description for easy mode", () => {
      render(<ScoreSidebar {...baseProps} mode="easy" />);
      expect(screen.getByText("Pick the right car from 4 choices.")).toBeInTheDocument();
    });

    it("shows the description for practice mode", () => {
      render(<ScoreSidebar {...baseProps} mode="practice" />);
      expect(screen.getByText("No leaderboard pressure. Drill your knowledge.")).toBeInTheDocument();
    });

    it("shows the description for hardcore mode", () => {
      render(<ScoreSidebar {...baseProps} mode="hardcore" />);
      expect(screen.getByText("Same as Standard. Panels are removed every 5 seconds to reveal the car.")).toBeInTheDocument();
    });

    it("shows empty description for an unrecognised mode", () => {
      render(<ScoreSidebar {...baseProps} mode="unknown" />);
      // Should not throw; description paragraph renders empty
      expect(screen.getByText("Score Gauge")).toBeInTheDocument();
    });
  });
});
