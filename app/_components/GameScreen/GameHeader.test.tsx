// @vitest-environment happy-dom
// Tests for the GameHeader HUD component.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GameHeader } from "./GameHeader";

const baseProps = {
  modeLabel: "Standard",
  username: "kristina",
  currentIndex: 0,
  totalRounds: 5,
  onBack: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GameHeader", () => {
  describe("back button", () => {
    it("renders a Garage back button", () => {
      render(<GameHeader {...baseProps} />);
      expect(screen.getByRole("button", { name: /garage/i })).toBeInTheDocument();
    });

    it("calls onBack when the Garage button is clicked", async () => {
      const onBack = vi.fn();
      render(<GameHeader {...baseProps} onBack={onBack} />);
      await userEvent.click(screen.getByRole("button", { name: /garage/i }));
      expect(onBack).toHaveBeenCalledOnce();
    });
  });

  describe("mode label", () => {
    it("renders the mode label", () => {
      render(<GameHeader {...baseProps} modeLabel="Hardcore" />);
      expect(screen.getByText("Hardcore")).toBeInTheDocument();
    });
  });

  describe("username", () => {
    it("renders the username when provided", () => {
      render(<GameHeader {...baseProps} username="kristina" />);
      expect(screen.getByText("kristina")).toBeInTheDocument();
    });

    it("does not render the username when it is empty", () => {
      render(<GameHeader {...baseProps} username="" />);
      expect(screen.queryByText("kristina")).not.toBeInTheDocument();
    });
  });

  describe("round counter", () => {
    it("shows the current round as 1-indexed over total", () => {
      render(<GameHeader {...baseProps} currentIndex={2} totalRounds={5} />);
      expect(screen.getByText("3/5")).toBeInTheDocument();
    });

    it("shows 1/N on the first round", () => {
      render(<GameHeader {...baseProps} currentIndex={0} totalRounds={10} />);
      expect(screen.getByText("1/10")).toBeInTheDocument();
    });
  });
});
