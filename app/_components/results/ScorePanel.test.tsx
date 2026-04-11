// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ScorePanel } from "./ScorePanel";

const baseProps = {
  score: 1234,
  grade: "A",
  gradeColor: "text-green-400",
  approxMax: 5000,
  personalBest: null,
};

describe("ScorePanel", () => {
  it("renders the score as a formatted number", () => {
    render(<ScorePanel {...baseProps} />);
    expect(screen.getByText((1234).toLocaleString())).toBeInTheDocument();
  });

  it("renders the grade letter", () => {
    render(<ScorePanel {...baseProps} />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("shows New PB! when score equals personalBest", () => {
    render(<ScorePanel {...baseProps} score={1234} personalBest={1234} />);
    expect(screen.getByText("New PB!")).toBeInTheDocument();
  });

  it("shows New PB! when score exceeds personalBest", () => {
    render(<ScorePanel {...baseProps} score={2000} personalBest={1000} />);
    expect(screen.getByText("New PB!")).toBeInTheDocument();
  });

  it("shows PB value when score is below personalBest", () => {
    render(<ScorePanel {...baseProps} score={500} personalBest={1234} />);
    expect(screen.getByText(`PB: ${(1234).toLocaleString()}`)).toBeInTheDocument();
    expect(screen.queryByText("New PB!")).not.toBeInTheDocument();
  });

  it("shows neither PB line when personalBest is null", () => {
    render(<ScorePanel {...baseProps} personalBest={null} />);
    expect(screen.queryByText("New PB!")).not.toBeInTheDocument();
    expect(screen.queryByText(/^PB:/)).not.toBeInTheDocument();
  });
});
