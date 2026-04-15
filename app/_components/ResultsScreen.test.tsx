// @vitest-environment happy-dom
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ResultsScreen from "./ResultsScreen";
import type { SessionData } from "./results/types";

const mockRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush, back: vi.fn() }),
  usePathname: () => "/results",
}));

// Render motion elements as plain HTML tags so animations don't interfere.
const MOTION_PROP_KEYS = new Set(["initial", "animate", "exit", "transition", "whileTap", "variants", "layout"]);
vi.mock("framer-motion", () => {
  function passthrough(tag: string) {
    return function MotionElement({ children, ...rest }: React.HTMLAttributes<HTMLElement> & Record<string, unknown>) {
      const htmlProps = Object.fromEntries(Object.entries(rest).filter(([k]) => !MOTION_PROP_KEYS.has(k)));
      return React.createElement(tag, htmlProps, children as React.ReactNode);
    };
  }
  return {
    motion: {
      div: passthrough("div"),
      button: passthrough("button"),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <React.Fragment>{children}</React.Fragment>,
  };
});

vi.mock("@/app/components/ui/ScoringNudge", () => ({
  ScoringNudge: ({ mode, score }: { mode: string; score: number }) => (
    <div data-testid="scoring-nudge">ScoringNudge: {mode} - {score}</div>
  ),
}));

vi.mock("./results/InitialsEntry", () => ({
  InitialsEntry: ({ onSubmitted }: { onSubmitted: () => void }) => (
    <div data-testid="initials-entry">
      <button onClick={onSubmitted}>Submit Initials</button>
    </div>
  ),
}));

vi.mock("@/app/components/ui/Tachometer", () => ({
  Tachometer: () => null,
}));

const mockSession: SessionData = {
  id: "game-1",
  mode: "easy",
  finalScore: 5000,
  personalBest: null,
  rounds: [],
};

const baseProps = {
  gameId: "game-1",
  hasToken: true,
  mode: "easy",
  username: "",
  maxScore: 10000,
};

beforeEach(() => {
  mockRouterPush.mockReset();
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve(mockSession),
  } as Response);
});

describe("ResultsScreen", () => {
  describe("loading state", () => {
    it("shows a loading spinner while fetching", () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => new Promise(() => {}),
      } as Response);

      render(<ResultsScreen {...baseProps} />);

      expect(screen.getByText("Loading results")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("shows an error message and back button when fetch returns an error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ error: "Session not found" }),
      } as Response);

      render(<ResultsScreen {...baseProps} />);

      await waitFor(() => {
        expect(screen.getByText("Session not found")).toBeInTheDocument();
      });

      expect(screen.getByText("Back to Garage")).toBeInTheDocument();
    });

    it("navigates to home when back button is clicked", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ error: "Session not found" }),
      } as Response);

      render(<ResultsScreen {...baseProps} />);

      await waitFor(() => {
        expect(screen.getByText("Back to Garage")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Back to Garage"));
      expect(mockRouterPush).toHaveBeenCalledWith("/");
    });

    it("shows fallback error when fetch throws", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      render(<ResultsScreen {...baseProps} />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load results.")).toBeInTheDocument();
      });
    });
  });

  describe("with session token (hasToken = true)", () => {
    it("renders the results header with mode label", async () => {
      render(<ResultsScreen {...baseProps} mode="easy" />);

      await waitFor(() => {
        expect(screen.getByText("Race Over")).toBeInTheDocument();
        expect(screen.getByText("Rookie Mode")).toBeInTheDocument();
      });
    });

    it("shows the 'Play Again' button", async () => {
      render(<ResultsScreen {...baseProps} />);

      await waitFor(() => {
        expect(screen.getByText("Play Again")).toBeInTheDocument();
      });
    });

    it("shows the 'Share Results' button", async () => {
      render(<ResultsScreen {...baseProps} />);

      await waitFor(() => {
        expect(screen.getByText("Share Results")).toBeInTheDocument();
      });
    });

    it("shows the 'Garage' button", async () => {
      render(<ResultsScreen {...baseProps} />);

      await waitFor(() => {
        expect(screen.getByText("Garage")).toBeInTheDocument();
      });
    });

    it("shows the ScoringNudge component", async () => {
      render(<ResultsScreen {...baseProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("scoring-nudge")).toBeInTheDocument();
      });
    });

    it("shows 'Copied!' after share button is clicked", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", {
        ...navigator,
        clipboard: { writeText },
        share: undefined,
      });

      render(<ResultsScreen {...baseProps} />);

      await waitFor(() => {
        expect(screen.getByText("Share Results")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Share Results"));
      expect(writeText).toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });

      vi.unstubAllGlobals();
    });

    it("uses navigator.share when available", async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", { ...navigator, share });

      render(<ResultsScreen {...baseProps} />);

      await waitFor(() => {
        expect(screen.getByText("Share Results")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Share Results"));
      expect(share).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Autoguessr",
          text: expect.stringContaining("5,000 pts"),
          url: expect.any(String),
        })
      );

      vi.unstubAllGlobals();
    });

    it("navigates to game page when 'Play Again' is clicked", async () => {
      render(<ResultsScreen {...baseProps} mode="easy" />);

      await waitFor(() => {
        expect(screen.getByText("Play Again")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Play Again"));
      expect(mockRouterPush).toHaveBeenCalledWith("/game?mode=easy");
    });

    it("navigates to home when 'Garage' is clicked", async () => {
      render(<ResultsScreen {...baseProps} />);

      await waitFor(() => {
        expect(screen.getByText("Garage")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Garage"));
      expect(mockRouterPush).toHaveBeenCalledWith("/");
    });
  });

  describe("without session token (hasToken = false) — share URL", () => {
    const shareUrlProps = { ...baseProps, hasToken: false };

    it("renders the results header with mode label", async () => {
      render(<ResultsScreen {...shareUrlProps} />);

      await waitFor(() => {
        expect(screen.getByText("Race Over")).toBeInTheDocument();
      });
    });

    it("shows the 'Play Game' button", async () => {
      render(<ResultsScreen {...shareUrlProps} />);

      await waitFor(() => {
        expect(screen.getByText("Play Game")).toBeInTheDocument();
      });
    });

    it("shows the 'Different Game Mode' button", async () => {
      render(<ResultsScreen {...shareUrlProps} />);

      await waitFor(() => {
        expect(screen.getByText("Different Game Mode")).toBeInTheDocument();
      });
    });

    it("does NOT show the 'Share Results' button", async () => {
      render(<ResultsScreen {...shareUrlProps} />);

      await waitFor(() => {
        expect(screen.queryByText("Share Results")).not.toBeInTheDocument();
      });
    });

    it("does NOT show the 'Play Again' button", async () => {
      render(<ResultsScreen {...shareUrlProps} />);

      await waitFor(() => {
        expect(screen.queryByText("Play Again")).not.toBeInTheDocument();
      });
    });

    it("does NOT show the 'Garage' button", async () => {
      render(<ResultsScreen {...shareUrlProps} />);

      await waitFor(() => {
        expect(screen.queryByText("Garage")).not.toBeInTheDocument();
      });
    });

    it("does NOT show the ScoringNudge component", async () => {
      render(<ResultsScreen {...shareUrlProps} />);

      await waitFor(() => {
        expect(screen.queryByTestId("scoring-nudge")).not.toBeInTheDocument();
      });
    });

    it("navigates to game page when 'Play Game' is clicked", async () => {
      render(<ResultsScreen {...shareUrlProps} mode="easy" />);

      await waitFor(() => {
        expect(screen.getByText("Play Game")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Play Game"));
      expect(mockRouterPush).toHaveBeenCalledWith("/game?mode=easy");
    });

    it("navigates to home when 'Different Game Mode' is clicked", async () => {
      render(<ResultsScreen {...shareUrlProps} />);

      await waitFor(() => {
        expect(screen.getByText("Different Game Mode")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Different Game Mode"));
      expect(mockRouterPush).toHaveBeenCalledWith("/");
    });
  });

  describe("with username", () => {
    it("includes username in game URL when playing again", async () => {
      render(<ResultsScreen {...baseProps} mode="easy" username="Player1" />);

      await waitFor(() => {
        expect(screen.getByText("Play Again")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Play Again"));
      expect(mockRouterPush).toHaveBeenCalledWith("/game?mode=easy&username=Player1");
    });

    it("includes username in game URL on share URL", async () => {
      render(<ResultsScreen {...baseProps} hasToken={false} mode="easy" username="Player1" />);

      await waitFor(() => {
        expect(screen.getByText("Play Game")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Play Game"));
      expect(mockRouterPush).toHaveBeenCalledWith("/game?mode=easy&username=Player1");
    });
  });

  describe("leaderboard / initials", () => {
    it("does not show initials entry in practice mode", async () => {
      render(<ResultsScreen {...baseProps} mode="practice" />);

      await waitFor(() => {
        expect(screen.queryByTestId("initials-entry")).not.toBeInTheDocument();
      });
    });

    it("shows initials entry for non-practice modes when hasToken is true", async () => {
      render(<ResultsScreen {...baseProps} mode="easy" />);

      await waitFor(() => {
        expect(screen.getByTestId("initials-entry")).toBeInTheDocument();
      });
    });
  });

  describe("different modes", () => {
    it.each([
      ["easy", "Rookie Mode"],
      ["standard", "Standard Mode"],
      ["hardcore", "Hardcore Mode"],
      ["time_attack", "Time Attack Mode"],
    ])("shows '%s' mode label as '%s'", async (mode, expectedLabel) => {
      render(<ResultsScreen {...baseProps} mode={mode} />);

      await waitFor(() => {
        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      });
    });
  });
});
