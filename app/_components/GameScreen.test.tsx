// @vitest-environment happy-dom
import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import GameScreen from "./GameScreen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Render motion elements as plain HTML tags so animations don't interfere.
vi.mock("framer-motion", () => {
  function passthrough(tag: string) {
    return function MotionElement({
      children,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      whileTap: _w,
      variants: _v,
      layout: _l,
      ...rest
    }: React.HTMLAttributes<HTMLElement> & Record<string, unknown>) {
      return React.createElement(tag, rest, children as React.ReactNode);
    };
  }
  return {
    motion: {
      div: passthrough("div"),
      button: passthrough("button"),
      img: passthrough("img"),
      span: passthrough("span"),
    },
    AnimatePresence: ({
      children,
    }: {
      children: React.ReactNode;
      mode?: string;
    }) => <React.Fragment>{children}</React.Fragment>,
  };
});

// Bypass the scoring intro so the game starts immediately.
vi.mock("@/app/components/ui/ScoringIntro", () => ({
  ScoringIntro: () => null,
  shouldShowIntro: () => false,
}));

vi.mock("@/app/components/ui/Tachometer", () => ({
  Tachometer: () => null,
}));

// ─── Fixture ──────────────────────────────────────────────────────────────────

const ROUND_ID = "round-1";
const TIME_LIMIT_MS = 10_000;

const GAME_DATA = {
  gameId: "game-1",
  rounds: [
    {
      roundId: ROUND_ID,
      sequenceNumber: 1,
      imageId: "img-1",
      imageUrl: "https://example.com/car.jpg",
    },
  ],
  easyChoices: {
    [ROUND_ID]: [
      { vehicleId: "v1", label: "Toyota Supra" },
      { vehicleId: "v2", label: "Honda Civic" },
    ],
  },
  timeLimitMs: TIME_LIMIT_MS,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GameScreen timer race condition", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("sends only one /api/guess request when the timer fires while a user answer is in flight", async () => {
    let guessCallCount = 0;

    // Hold the guess response open so the timer can fire while the fetch is
    // still in-flight — this is the window where the race condition occurs.
    let releaseGuess!: () => void;
    const guessHeld = new Promise<void>((resolve) => {
      releaseGuess = resolve;
    });

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.startsWith("/api/game")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(GAME_DATA),
        } as Response);
      }
      if (url === "/api/flags") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response);
      }
      if (url === "/api/guess") {
        guessCallCount++;
        return guessHeld.then(
          () =>
            ({
              ok: true,
              status: 200,
              json: () =>
                Promise.resolve({
                  makeMatch: true,
                  modelMatch: true,
                  pointsEarned: 500,
                  vehicle: { make: "Toyota", model: "Supra", year: 1994 },
                }),
            }) as unknown as Response,
        );
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    render(<GameScreen mode="easy" username="test" filter="" />);

    // Flush the initial /api/game and /api/flags fetches.
    await act(async () => {
      await Promise.resolve();
    });

    // The choice buttons should now be visible.
    const choice = screen.getByText("Toyota Supra");

    // User clicks an answer — starts a /api/guess fetch that won't resolve yet.
    await act(async () => {
      fireEvent.click(choice);
    });

    expect(guessCallCount).toBe(1);

    // Timer expires while the user's guess is still in flight — this is where
    // the race condition fires a second /api/guess call.
    await act(async () => {
      vi.advanceTimersByTime(TIME_LIMIT_MS);
    });

    // Only one /api/guess call should ever be made per round.
    expect(guessCallCount).toBe(1);

    // Clean up the held promise so the test doesn't leak.
    releaseGuess();
  });
});
