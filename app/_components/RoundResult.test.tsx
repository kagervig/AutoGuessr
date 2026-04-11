// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { RoundResult } from "./RoundResult";
import type { RevealInfo } from "./RoundResult";

const baseReveal: RevealInfo = {
  correctLabel: "Toyota Supra",
  guessLabel: "Toyota Supra",
  isCorrect: true,
  pointsEarned: 350,
  breakdown: {
    makePoints: 100,
    modelPoints: 200,
    yearBonus: 50,
    yearDelta: 0,
    timeBonus: 0,
    modeMultiplier: 1,
    proBonus: 0,
  },
};

const baseProps = {
  reveal: baseReveal,
  round: 1,
  totalRounds: 10,
  totalScore: 350,
  imageRating: null as "up" | "down" | null,
  imageReported: false,
  onRate: vi.fn(),
  onReport: vi.fn(),
  onNext: vi.fn(),
};

describe("RoundResult", () => {
  describe("score breakdown", () => {
    it("renders the total points earned from the reveal", () => {
      render(<RoundResult {...baseProps} />);
      expect(screen.getByText(`+${(350).toLocaleString()}`)).toBeInTheDocument();
    });

    it("renders individual breakdown line items that are non-zero", () => {
      render(<RoundResult {...baseProps} />);
      expect(screen.getByText("Correct make")).toBeInTheDocument();
      expect(screen.getByText(`+${baseReveal.breakdown!.makePoints}`)).toBeInTheDocument();
      expect(screen.getByText("Correct model")).toBeInTheDocument();
      expect(screen.getByText(`+${baseReveal.breakdown!.modelPoints}`)).toBeInTheDocument();
    });

    it("renders the year bonus line when yearBonus > 0", () => {
      const reveal = { ...baseReveal, breakdown: { ...baseReveal.breakdown!, yearBonus: 50 } };
      render(<RoundResult {...baseProps} reveal={reveal} />);
      expect(screen.getByText("Year bonus")).toBeInTheDocument();
    });

    it("renders the speed bonus line when timeBonus > 0", () => {
      const reveal = { ...baseReveal, breakdown: { ...baseReveal.breakdown!, timeBonus: 75 }, pointsEarned: 425 };
      render(<RoundResult {...baseProps} reveal={reveal} />);
      expect(screen.getByText("Speed bonus")).toBeInTheDocument();
    });

    it("renders the difficulty multiplier line when modeMultiplier > 1", () => {
      const reveal = { ...baseReveal, breakdown: { ...baseReveal.breakdown!, modeMultiplier: 1.5 }, pointsEarned: 525 };
      render(<RoundResult {...baseProps} reveal={reveal} />);
      expect(screen.getByText("Difficulty multiplier")).toBeInTheDocument();
    });

    it("renders the rare find line when proBonus > 0", () => {
      const reveal = { ...baseReveal, breakdown: { ...baseReveal.breakdown!, proBonus: 100 }, pointsEarned: 450 };
      render(<RoundResult {...baseProps} reveal={reveal} />);
      expect(screen.getByText("Rare find")).toBeInTheDocument();
    });

    it("shows No points scored when pointsEarned is 0", () => {
      const reveal = { ...baseReveal, isCorrect: false, pointsEarned: 0, breakdown: undefined };
      render(<RoundResult {...baseProps} reveal={reveal} />);
      expect(screen.getByText("No points scored")).toBeInTheDocument();
    });

    it("shows simple points badge when pointsEarned > 0 but no breakdown is provided", () => {
      const reveal = { ...baseReveal, breakdown: undefined };
      render(<RoundResult {...baseProps} reveal={reveal} />);
      expect(screen.getByText(/\+350/)).toBeInTheDocument();
    });
  });

  describe("next button", () => {
    it("calls onNext when clicked", async () => {
      const onNext = vi.fn();
      render(<RoundResult {...baseProps} onNext={onNext} />);
      await userEvent.click(screen.getByText("Next Round"));
      expect(onNext).toHaveBeenCalledOnce();
    });

    it("shows Next Round on non-final rounds", () => {
      render(<RoundResult {...baseProps} round={1} totalRounds={10} />);
      expect(screen.getByText("Next Round")).toBeInTheDocument();
    });

    it("shows See Results on the final round", () => {
      render(<RoundResult {...baseProps} round={10} totalRounds={10} />);
      expect(screen.getByText("See Results")).toBeInTheDocument();
    });
  });

  describe("rating buttons", () => {
    it("calls onRate with 'up' when thumbs up is clicked", async () => {
      const onRate = vi.fn();
      render(<RoundResult {...baseProps} onRate={onRate} />);
      await userEvent.click(screen.getByLabelText("Thumbs up"));
      expect(onRate).toHaveBeenCalledWith("up");
    });

    it("calls onRate with 'down' when thumbs down is clicked", async () => {
      const onRate = vi.fn();
      render(<RoundResult {...baseProps} onRate={onRate} />);
      await userEvent.click(screen.getByLabelText("Thumbs down"));
      expect(onRate).toHaveBeenCalledWith("down");
    });
  });

  describe("report button", () => {
    it("calls onReport when clicked", async () => {
      const onReport = vi.fn();
      render(<RoundResult {...baseProps} onReport={onReport} />);
      await userEvent.click(screen.getByLabelText("Report image"));
      expect(onReport).toHaveBeenCalledOnce();
    });

    it("is disabled when imageReported is true", () => {
      render(<RoundResult {...baseProps} imageReported={true} />);
      expect(screen.getByLabelText("Report image")).toBeDisabled();
    });

    it("is enabled when imageReported is false", () => {
      render(<RoundResult {...baseProps} imageReported={false} />);
      expect(screen.getByLabelText("Report image")).not.toBeDisabled();
    });
  });

  describe("correct vs incorrect", () => {
    it("shows Nailed it! on a correct guess", () => {
      render(<RoundResult {...baseProps} reveal={{ ...baseReveal, isCorrect: true }} />);
      expect(screen.getByText("Nailed it!")).toBeInTheDocument();
    });

    it("shows Miss! on an incorrect guess", () => {
      const reveal = { ...baseReveal, isCorrect: false, pointsEarned: 0, breakdown: undefined };
      render(<RoundResult {...baseProps} reveal={reveal} />);
      expect(screen.getByText("Miss!")).toBeInTheDocument();
    });
  });
});
