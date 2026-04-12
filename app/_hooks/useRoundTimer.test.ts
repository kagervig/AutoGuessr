// @vitest-environment happy-dom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useRoundTimer } from "./useRoundTimer";
import type { GameData } from "./useGameLoader";

const GAME_DATA: GameData = {
  gameId: "game-1",
  rounds: [
    {
      roundId: "round-1",
      sequenceNumber: 1,
      imageId: "img-1",
      imageUrl: "https://example.com/car1.jpg",
    },
    {
      roundId: "round-2",
      sequenceNumber: 2,
      imageId: "img-2",
      imageUrl: "https://example.com/car2.jpg",
    },
  ],
  timeLimitMs: 10_000,
};

describe("useRoundTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns all-visible panels initially", () => {
    const onTimeout = { current: vi.fn() };
    const { result } = renderHook(() =>
      useRoundTimer({
        mode: "easy",
        gameData: null,
        currentIndex: 0,
        introVisible: false,
        onTimeout,
      }),
    );
    expect(result.current.visiblePanels).toHaveLength(9);
    expect(result.current.visiblePanels.every(Boolean)).toBe(true);
  });

  it("resets hasSubmittedRef to false when currentIndex changes", () => {
    const onTimeout = { current: vi.fn() };
    const { result, rerender } = renderHook(
      ({ currentIndex }) =>
        useRoundTimer({
          mode: "easy",
          gameData: GAME_DATA,
          currentIndex,
          introVisible: false,
          onTimeout,
        }),
      { initialProps: { currentIndex: 0 } },
    );

    result.current.hasSubmittedRef.current = true;
    rerender({ currentIndex: 1 });

    expect(result.current.hasSubmittedRef.current).toBe(false);
  });

  it("calls onTimeout after the game's time limit", async () => {
    const onTimeout = { current: vi.fn() };
    renderHook(() =>
      useRoundTimer({
        mode: "easy",
        gameData: GAME_DATA,
        currentIndex: 0,
        introVisible: false,
        onTimeout,
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    expect(onTimeout.current).toHaveBeenCalled();
  });

  it("does not call onTimeout when introVisible is true", async () => {
    const onTimeout = { current: vi.fn() };
    renderHook(() =>
      useRoundTimer({
        mode: "easy",
        gameData: GAME_DATA,
        currentIndex: 0,
        introVisible: true,
        onTimeout,
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    expect(onTimeout.current).not.toHaveBeenCalled();
  });

  it("hides the first hardcore panel immediately when the round starts", () => {
    const onTimeout = { current: vi.fn() };
    const { result } = renderHook(() =>
      useRoundTimer({
        mode: "hardcore",
        gameData: GAME_DATA,
        currentIndex: 0,
        introVisible: false,
        onTimeout,
      }),
    );

    const hiddenCount = result.current.visiblePanels.filter((v) => !v).length;
    expect(hiddenCount).toBe(1);
  });

  it("populates currentRoundIdRef and currentRoundImageUrlRef for the active round", () => {
    const onTimeout = { current: vi.fn() };
    const { result } = renderHook(() =>
      useRoundTimer({
        mode: "easy",
        gameData: GAME_DATA,
        currentIndex: 1,
        introVisible: false,
        onTimeout,
      }),
    );

    expect(result.current.currentRoundIdRef.current).toBe("round-2");
    expect(result.current.currentRoundImageUrlRef.current).toBe(
      "https://example.com/car2.jpg",
    );
  });
});
