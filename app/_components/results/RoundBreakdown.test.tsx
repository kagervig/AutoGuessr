// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { RoundBreakdown } from "./RoundBreakdown";
import type { RoundData, GuessData } from "./types";

const makeRound = (
  sequenceNumber: number,
  make: string,
  model: string,
  guess: GuessData | null,
): RoundData => ({
  sequenceNumber,
  imageUrl: `/img/r${sequenceNumber}.jpg`,
  image: {
    filename: `r${sequenceNumber}.jpg`,
    vehicleId: `v${sequenceNumber}`,
    vehicle: { make, model, year: 1994, countryOfOrigin: "JP" },
  },
  guess,
});

const correctGuess: GuessData = {
  isCorrect: true,
  makePoints: 100,
  modelPoints: 200,
  yearBonus: 50,
  yearDelta: 0,
  timeBonus: 0,
  modeMultiplier: 1,
  proBonus: 0,
  pointsEarned: 350,
  rawInput: "Toyota Supra",
  guessedVehicle: { make: "Toyota", model: "Supra", year: 1994 },
};

const missedGuess: GuessData = {
  isCorrect: false,
  makePoints: 0,
  modelPoints: 0,
  yearBonus: null,
  yearDelta: null,
  timeBonus: 0,
  modeMultiplier: 1,
  proBonus: 0,
  pointsEarned: 0,
  rawInput: "Honda Civic",
  guessedVehicle: { make: "Honda", model: "Civic", year: 1990 },
};

describe("RoundBreakdown", () => {
  it("renders a row for each round", () => {
    const rounds = [
      makeRound(1, "Toyota", "Supra", correctGuess),
      makeRound(2, "Honda", "NSX", missedGuess),
      makeRound(3, "Mazda", "RX-7", correctGuess),
    ];
    render(<RoundBreakdown rounds={rounds} mode="easy" />);

    expect(screen.getAllByText("Toyota Supra")).toHaveLength(2); // mobile + desktop layout
    expect(screen.getAllByText("Honda NSX")).toHaveLength(2);
    expect(screen.getAllByText("Mazda RX-7")).toHaveLength(2);
  });

  it("collapses the list when the toggle is clicked", async () => {
    const rounds = [makeRound(1, "Toyota", "Supra", correctGuess)];
    render(<RoundBreakdown rounds={rounds} mode="easy" />);

    expect(screen.getAllByText("Toyota Supra")).toHaveLength(2);

    await userEvent.click(screen.getByText("Round Breakdown"));

    expect(screen.queryByText("Toyota Supra")).not.toBeInTheDocument();
  });

  it("expands the list again after a second toggle click", async () => {
    const rounds = [makeRound(1, "Toyota", "Supra", correctGuess)];
    render(<RoundBreakdown rounds={rounds} mode="easy" />);

    await userEvent.click(screen.getByText("Round Breakdown"));
    await userEvent.click(screen.getByText("Round Breakdown"));

    expect(screen.getAllByText("Toyota Supra")).toHaveLength(2);
  });

  it("shows +{pointsEarned} for a correct guess", () => {
    render(<RoundBreakdown rounds={[makeRound(1, "Toyota", "Supra", correctGuess)]} mode="easy" />);
    expect(screen.getAllByText(`+${(350).toLocaleString()}`)[0]).toBeInTheDocument();
  });

  it("shows 0 and Missed Round for a missed guess", () => {
    render(<RoundBreakdown rounds={[makeRound(1, "Honda", "NSX", missedGuess)]} mode="easy" />);
    expect(screen.getAllByText("0")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Missed Round")[0]).toBeInTheDocument();
  });

  describe("bonus categories", () => {
    it("shows Make bonus when makePoints > 0", () => {
      const guess = { ...correctGuess, makePoints: 100, pointsEarned: 100 };
      render(<RoundBreakdown rounds={[makeRound(1, "Toyota", "Supra", guess)]} mode="easy" />);
      expect(screen.getAllByText("Make")[0]).toBeInTheDocument();
    });

    it("does not show Make bonus when makePoints is 0", () => {
      const guess = { ...correctGuess, makePoints: 0, modelPoints: 200, pointsEarned: 200 };
      render(<RoundBreakdown rounds={[makeRound(1, "Toyota", "Supra", guess)]} mode="easy" />);
      expect(screen.queryByText("Make")).not.toBeInTheDocument();
    });

    it("shows Model bonus when modelPoints > 0", () => {
      const guess = { ...correctGuess, modelPoints: 200, pointsEarned: 200 };
      render(<RoundBreakdown rounds={[makeRound(1, "Toyota", "Supra", guess)]} mode="easy" />);
      expect(screen.getAllByText("Model")[0]).toBeInTheDocument();
    });

    it("does not show Model bonus when modelPoints is 0", () => {
      const guess = { ...correctGuess, modelPoints: 0, makePoints: 100, yearBonus: null, timeBonus: 0, proBonus: 0, pointsEarned: 100 };
      render(<RoundBreakdown rounds={[makeRound(1, "Toyota", "Supra", guess)]} mode="easy" />);
      expect(screen.queryByText("Model")).not.toBeInTheDocument();
    });

    it("shows Year bonus when yearBonus > 0", () => {
      const guess = { ...correctGuess, yearBonus: 50, pointsEarned: 350 };
      render(<RoundBreakdown rounds={[makeRound(1, "Toyota", "Supra", guess)]} mode="standard" />);
      expect(screen.getAllByText("Year")[0]).toBeInTheDocument();
    });

    it("does not show Year bonus when yearBonus is null", () => {
      const guess = { ...correctGuess, yearBonus: null, pointsEarned: 300 };
      render(<RoundBreakdown rounds={[makeRound(1, "Toyota", "Supra", guess)]} mode="standard" />);
      expect(screen.queryByText("Year")).not.toBeInTheDocument();
    });

    it("shows Speed bonus when timeBonus > 0", () => {
      const guess = { ...correctGuess, timeBonus: 75, pointsEarned: 425 };
      render(<RoundBreakdown rounds={[makeRound(1, "Toyota", "Supra", guess)]} mode="time_attack" />);
      expect(screen.getAllByText("Speed")[0]).toBeInTheDocument();
    });

    it("does not show Speed bonus when timeBonus is 0", () => {
      const guess = { ...correctGuess, timeBonus: 0, pointsEarned: 350 };
      render(<RoundBreakdown rounds={[makeRound(1, "Toyota", "Supra", guess)]} mode="time_attack" />);
      expect(screen.queryByText("Speed")).not.toBeInTheDocument();
    });

    it("shows Mult bonus when modeMultiplier > 1", () => {
      const guess = { ...correctGuess, modeMultiplier: 1.5, pointsEarned: 525 };
      render(<RoundBreakdown rounds={[makeRound(1, "Toyota", "Supra", guess)]} mode="hardcore" />);
      expect(screen.getAllByText("Mult")[0]).toBeInTheDocument();
    });

    it("does not show Mult bonus when modeMultiplier is 1", () => {
      const guess = { ...correctGuess, modeMultiplier: 1, pointsEarned: 350 };
      render(<RoundBreakdown rounds={[makeRound(1, "Toyota", "Supra", guess)]} mode="hardcore" />);
      expect(screen.queryByText("Mult")).not.toBeInTheDocument();
    });

    it("shows Pro bonus when proBonus > 0", () => {
      const guess = { ...correctGuess, proBonus: 100, pointsEarned: 450 };
      render(<RoundBreakdown rounds={[makeRound(1, "Toyota", "Supra", guess)]} mode="standard" />);
      expect(screen.getAllByText("Pro")[0]).toBeInTheDocument();
    });

    it("does not show Pro bonus when proBonus is 0", () => {
      const guess = { ...correctGuess, proBonus: 0, pointsEarned: 350 };
      render(<RoundBreakdown rounds={[makeRound(1, "Toyota", "Supra", guess)]} mode="standard" />);
      expect(screen.queryByText("Pro")).not.toBeInTheDocument();
    });
  });

  describe("year badge", () => {
    it.each(["standard", "hardcore", "time_attack"])(
      "shows the year badge in %s mode",
      (mode) => {
        render(<RoundBreakdown rounds={[makeRound(1, "Toyota", "Supra", correctGuess)]} mode={mode} />);
        expect(screen.getAllByText("1994")[0]).toBeInTheDocument();
      }
    );

    it.each(["easy", "custom"])(
      "does not show the year badge in %s mode",
      (mode) => {
        render(<RoundBreakdown rounds={[makeRound(1, "Toyota", "Supra", correctGuess)]} mode={mode} />);
        expect(screen.queryByText("1994")).not.toBeInTheDocument();
      }
    );
  });
});
