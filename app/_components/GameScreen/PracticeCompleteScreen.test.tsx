// @vitest-environment happy-dom
// Tests for PracticeCompleteScreen: session summary display and navigation.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PracticeCompleteScreen } from "./PracticeCompleteScreen";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
  },
}));

const completedRounds = [
  { imageUrl: "https://example.com/1.jpg", correctLabel: "Toyota Supra", isCorrect: true },
  { imageUrl: "https://example.com/2.jpg", correctLabel: "Honda NSX", isCorrect: false },
  { imageUrl: "https://example.com/3.jpg", correctLabel: "Mazda RX-7", isCorrect: true },
];

const baseProps = {
  username: "kristina",
  completedRounds,
  onPlayAgain: vi.fn(),
  onBack: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PracticeCompleteScreen", () => {
  describe("heading", () => {
    it("renders the Session Over heading", () => {
      render(<PracticeCompleteScreen {...baseProps} />);
      expect(screen.getByText("Session Over")).toBeInTheDocument();
    });

    it("shows the username in the subtitle", () => {
      render(<PracticeCompleteScreen {...baseProps} username="kristina" />);
      expect(screen.getByText(/kristina/)).toBeInTheDocument();
    });

    it("falls back to Driver when username is empty", () => {
      render(<PracticeCompleteScreen {...baseProps} username="" />);
      expect(screen.getByText(/Driver/)).toBeInTheDocument();
    });
  });

  describe("score summary", () => {
    it("shows the number of correct answers", () => {
      render(<PracticeCompleteScreen {...baseProps} />);
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("shows the total number of rounds", () => {
      render(<PracticeCompleteScreen {...baseProps} />);
      expect(screen.getByText(/\/ 3/)).toBeInTheDocument();
    });
  });

  describe("round list", () => {
    it("renders the correct label for each round", () => {
      render(<PracticeCompleteScreen {...baseProps} />);
      expect(screen.getByText("Toyota Supra")).toBeInTheDocument();
      expect(screen.getByText("Honda NSX")).toBeInTheDocument();
      expect(screen.getByText("Mazda RX-7")).toBeInTheDocument();
    });

    it("shows a checkmark for correct rounds", () => {
      render(<PracticeCompleteScreen {...baseProps} />);
      expect(screen.getAllByText("✓")).toHaveLength(2);
    });

    it("shows a cross for incorrect rounds", () => {
      render(<PracticeCompleteScreen {...baseProps} />);
      expect(screen.getAllByText("✗")).toHaveLength(1);
    });
  });

  describe("navigation buttons", () => {
    it("calls onPlayAgain when Play Again is clicked", async () => {
      const onPlayAgain = vi.fn();
      render(<PracticeCompleteScreen {...baseProps} onPlayAgain={onPlayAgain} />);
      await userEvent.click(screen.getByRole("button", { name: /play again/i }));
      expect(onPlayAgain).toHaveBeenCalledOnce();
    });

    it("calls onBack when Garage is clicked", async () => {
      const onBack = vi.fn();
      render(<PracticeCompleteScreen {...baseProps} onBack={onBack} />);
      await userEvent.click(screen.getByRole("button", { name: /garage/i }));
      expect(onBack).toHaveBeenCalledOnce();
    });
  });
});
