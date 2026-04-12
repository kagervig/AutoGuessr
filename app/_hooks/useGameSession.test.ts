// @vitest-environment happy-dom
// Tests for useGameSession.
import { renderHook, act, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGameSession } from "./useGameSession";
import type { GameData } from "./useGameLoader";

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ROUND_1_ID = "round-1";
const ROUND_2_ID = "round-2";

const GAME_DATA_ONE_ROUND: GameData = {
  gameId: "game-1",
  rounds: [{ roundId: ROUND_1_ID, sequenceNumber: 1, imageId: "img-1", imageUrl: "https://example.com/car1.jpg" }],
  easyChoices: {
    [ROUND_1_ID]: [
      { vehicleId: "v1", label: "Toyota Supra" },
      { vehicleId: "v2", label: "Honda Civic" },
    ],
  },
};

const GAME_DATA_TWO_ROUNDS: GameData = {
  gameId: "game-2",
  rounds: [
    { roundId: ROUND_1_ID, sequenceNumber: 1, imageId: "img-1", imageUrl: "https://example.com/car1.jpg" },
    { roundId: ROUND_2_ID, sequenceNumber: 2, imageId: "img-2", imageUrl: "https://example.com/car2.jpg" },
  ],
  easyChoices: {
    [ROUND_1_ID]: [
      { vehicleId: "v1", label: "Toyota Supra" },
      { vehicleId: "v2", label: "Honda Civic" },
    ],
    [ROUND_2_ID]: [
      { vehicleId: "v3", label: "Ford Mustang" },
      { vehicleId: "v4", label: "Dodge Challenger" },
    ],
  },
};

function makeRefs(roundId = ROUND_1_ID, imageUrl = "https://example.com/car1.jpg") {
  return {
    hasSubmittedRef: { current: false },
    roundStartRef: { current: 0 },
    currentRoundIdRef: { current: roundId },
    currentRoundImageUrlRef: { current: imageUrl },
    autoSubmitRef: { current: null as ReturnType<typeof setTimeout> | null },
    panelIndexRef: { current: 0 },
    panelIntervalRef: { current: null as ReturnType<typeof setInterval> | null },
    handleTimeoutRef: { current: vi.fn() as () => void },
  };
}

const GUESS_SUCCESS = {
  makeMatch: true,
  modelMatch: true,
  pointsEarned: 500,
  vehicle: { make: "Toyota", model: "Supra", year: 1994 },
  makePoints: 200,
  modelPoints: 200,
  yearBonus: 100,
  yearDelta: 0,
  timeBonus: 0,
  modeMultiplier: 1,
  proBonus: 0,
};

function mockFetchGuessSuccess() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(GUESS_SUCCESS),
  } as unknown as Response);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useGameSession", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns initial state with roundState answering", () => {
    const refs = makeRefs();
    const { result } = renderHook(() =>
      useGameSession({ mode: "easy", username: "test", filter: "", gameData: GAME_DATA_ONE_ROUND, mediumYearGuessing: false, currentIndex: 0, setCurrentIndex: vi.fn(), ...refs }),
    );
    expect(result.current.roundState).toBe("answering");
    expect(result.current.score).toBe(0);
    expect(result.current.practiceComplete).toBe(false);
    expect(result.current.networkError).toBe(false);
  });

  it("handleEasyAnswer submits to /api/guess and reveals the result", async () => {
    mockFetchGuessSuccess();
    const refs = makeRefs();
    const { result } = renderHook(() =>
      useGameSession({ mode: "easy", username: "test", filter: "", gameData: GAME_DATA_ONE_ROUND, mediumYearGuessing: false, currentIndex: 0, setCurrentIndex: vi.fn(), ...refs }),
    );

    await act(async () => {
      await result.current.handleEasyAnswer("v1");
    });

    expect(result.current.roundState).toBe("revealed");
    expect(result.current.score).toBe(500);
    expect(result.current.reveal?.isCorrect).toBe(true);
    expect(result.current.selectedEasyId).toBe("v1");
  });

  it("handleNext advances currentIndex on a non-last round", async () => {
    mockFetchGuessSuccess();
    const refs = makeRefs();
    // Use a real useState so setCurrentIndex triggers re-renders correctly.
    const { result } = renderHook(() => {
      const [currentIndex, setCurrentIndex] = useState(0);
      return { currentIndex, ...useGameSession({ mode: "easy", username: "test", filter: "", gameData: GAME_DATA_TWO_ROUNDS, mediumYearGuessing: false, currentIndex, setCurrentIndex, ...refs }) };
    });

    await act(async () => { await result.current.handleEasyAnswer("v1"); });
    await act(async () => { await result.current.handleNext(); });

    expect(result.current.currentIndex).toBe(1);
    expect(result.current.roundState).toBe("answering");
    expect(result.current.reveal).toBeNull();
    expect(result.current.imageRating).toBeNull();
  });

  it("handleNext on the last non-practice round calls /api/session/end and navigates to results", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(GUESS_SUCCESS) } as unknown as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({}) } as unknown as Response);

    const refs = makeRefs();
    const { result } = renderHook(() =>
      useGameSession({ mode: "easy", username: "test", filter: "", gameData: GAME_DATA_ONE_ROUND, mediumYearGuessing: false, currentIndex: 0, setCurrentIndex: vi.fn(), ...refs }),
    );

    await act(async () => { await result.current.handleEasyAnswer("v1"); });
    await act(async () => { await result.current.handleNext(); });

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("/results"));
  });

  it("handleNext on the last practice round sets practiceComplete", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(GUESS_SUCCESS) } as unknown as Response)
      .mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) } as unknown as Response);

    const refs = makeRefs();
    const { result } = renderHook(() =>
      useGameSession({ mode: "practice", username: "test", filter: "", gameData: GAME_DATA_ONE_ROUND, mediumYearGuessing: false, currentIndex: 0, setCurrentIndex: vi.fn(), ...refs }),
    );

    await act(async () => { await result.current.handleEasyAnswer("v1"); });
    await act(async () => { await result.current.handleNext(); });

    expect(result.current.practiceComplete).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("sets networkError when the guess fetch throws a network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Network failure"));
    const refs = makeRefs();
    const { result } = renderHook(() =>
      useGameSession({ mode: "easy", username: "test", filter: "", gameData: GAME_DATA_ONE_ROUND, mediumYearGuessing: false, currentIndex: 0, setCurrentIndex: vi.fn(), ...refs }),
    );

    await act(async () => {
      await result.current.handleEasyAnswer("v1");
    });

    expect(result.current.networkError).toBe(true);
  });

  it("handleRateImage toggles the rating off when the same value is passed again", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) } as unknown as Response);
    const refs = makeRefs();
    const { result } = renderHook(() =>
      useGameSession({ mode: "easy", username: "test", filter: "", gameData: GAME_DATA_ONE_ROUND, mediumYearGuessing: false, currentIndex: 0, setCurrentIndex: vi.fn(), ...refs }),
    );

    await act(async () => { await result.current.handleRateImage("up"); });
    expect(result.current.imageRating).toBe("up");

    await act(async () => { await result.current.handleRateImage("up"); });
    expect(result.current.imageRating).toBeNull();
  });

  it("handleTimeout reveals the round with no points when called", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ vehicle: { make: "Toyota", model: "Supra", year: 1994 } }),
    } as unknown as Response);

    const refs = makeRefs();
    const { result } = renderHook(() =>
      useGameSession({ mode: "easy", username: "test", filter: "", gameData: GAME_DATA_ONE_ROUND, mediumYearGuessing: false, currentIndex: 0, setCurrentIndex: vi.fn(), ...refs }),
    );

    await act(async () => {
      await result.current.handleTimeout();
    });

    expect(result.current.roundState).toBe("revealed");
    expect(result.current.score).toBe(0);
    expect(result.current.reveal?.pointsEarned).toBe(0);
  });

  describe("handleHardSubmit", () => {
    it("resolves the round with zero points without calling fetch when make and model are both empty", async () => {
      global.fetch = vi.fn();
      const refs = makeRefs();
      const { result } = renderHook(() =>
        useGameSession({ mode: "standard", username: "test", filter: "", gameData: GAME_DATA_ONE_ROUND, mediumYearGuessing: false, currentIndex: 0, setCurrentIndex: vi.fn(), ...refs }),
      );

      await act(async () => {
        await result.current.handleHardSubmit("", "", "");
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(result.current.roundState).toBe("revealed");
      expect(result.current.score).toBe(0);
      expect(result.current.reveal?.isCorrect).toBe(false);
    });

    it("includes guessedYear as a number in the request body", async () => {
      mockFetchGuessSuccess();
      const refs = makeRefs();
      const { result } = renderHook(() =>
        useGameSession({ mode: "standard", username: "test", filter: "", gameData: GAME_DATA_ONE_ROUND, mediumYearGuessing: false, currentIndex: 0, setCurrentIndex: vi.fn(), ...refs }),
      );

      await act(async () => {
        await result.current.handleHardSubmit("Toyota", "Supra", "1994");
      });

      const body = JSON.parse((vi.mocked(global.fetch).mock.calls[0][1]!.body) as string);
      expect(body.guessedYear).toBe(1994);
    });

    it("includes panelsRevealed in the request body for hardcore mode", async () => {
      mockFetchGuessSuccess();
      const refs = makeRefs();
      refs.panelIndexRef.current = 3;
      const { result } = renderHook(() =>
        useGameSession({ mode: "hardcore", username: "test", filter: "", gameData: GAME_DATA_ONE_ROUND, mediumYearGuessing: false, currentIndex: 0, setCurrentIndex: vi.fn(), ...refs }),
      );

      await act(async () => {
        await result.current.handleHardSubmit("Toyota", "Supra", "1994");
      });

      const body = JSON.parse((vi.mocked(global.fetch).mock.calls[0][1]!.body) as string);
      expect(body.panelsRevealed).toBe(3);
    });

    it("omits panelsRevealed from the request body for non-hardcore modes", async () => {
      mockFetchGuessSuccess();
      const refs = makeRefs();
      const { result } = renderHook(() =>
        useGameSession({ mode: "standard", username: "test", filter: "", gameData: GAME_DATA_ONE_ROUND, mediumYearGuessing: false, currentIndex: 0, setCurrentIndex: vi.fn(), ...refs }),
      );

      await act(async () => {
        await result.current.handleHardSubmit("Toyota", "Supra", "1994");
      });

      const body = JSON.parse((vi.mocked(global.fetch).mock.calls[0][1]!.body) as string);
      expect(body.panelsRevealed).toBeUndefined();
    });
  });

  describe("handleMediumSubmit", () => {
    it("omits guessedYear from the request body when mediumYearGuessing is false", async () => {
      mockFetchGuessSuccess();
      const refs = makeRefs();
      const { result } = renderHook(() =>
        useGameSession({ mode: "custom", username: "test", filter: "", gameData: GAME_DATA_ONE_ROUND, mediumYearGuessing: false, currentIndex: 0, setCurrentIndex: vi.fn(), ...refs }),
      );

      await act(async () => {
        await result.current.handleMediumSubmit("Toyota", "Supra", "1994");
      });

      const body = JSON.parse((vi.mocked(global.fetch).mock.calls[0][1]!.body) as string);
      expect(body.guessedYear).toBeUndefined();
    });

    it("includes guessedYear in the request body when mediumYearGuessing is true", async () => {
      mockFetchGuessSuccess();
      const refs = makeRefs();
      const { result } = renderHook(() =>
        useGameSession({ mode: "custom", username: "test", filter: "", gameData: GAME_DATA_ONE_ROUND, mediumYearGuessing: true, currentIndex: 0, setCurrentIndex: vi.fn(), ...refs }),
      );

      await act(async () => {
        await result.current.handleMediumSubmit("Toyota", "Supra", "1994");
      });

      const body = JSON.parse((vi.mocked(global.fetch).mock.calls[0][1]!.body) as string);
      expect(body.guessedYear).toBe(1994);
    });
  });

  describe("401 handling", () => {
    it("navigates to home when /api/guess returns 401 via handleEasyAnswer", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: vi.fn() } as unknown as Response);
      const refs = makeRefs();
      const { result } = renderHook(() =>
        useGameSession({ mode: "easy", username: "test", filter: "", gameData: GAME_DATA_ONE_ROUND, mediumYearGuessing: false, currentIndex: 0, setCurrentIndex: vi.fn(), ...refs }),
      );

      await act(async () => {
        await result.current.handleEasyAnswer("v1");
      });

      expect(mockPush).toHaveBeenCalledWith("/");
      expect(result.current.roundState).toBe("answering");
    });

    it("navigates to home when /api/guess returns 401 via handleHardSubmit", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: vi.fn() } as unknown as Response);
      const refs = makeRefs();
      const { result } = renderHook(() =>
        useGameSession({ mode: "standard", username: "test", filter: "", gameData: GAME_DATA_ONE_ROUND, mediumYearGuessing: false, currentIndex: 0, setCurrentIndex: vi.fn(), ...refs }),
      );

      await act(async () => {
        await result.current.handleHardSubmit("Toyota", "Supra", "1994");
      });

      expect(mockPush).toHaveBeenCalledWith("/");
      expect(result.current.roundState).toBe("answering");
    });
  });

  it("syncs handleTimeoutRef.current to the latest handleTimeout after render", async () => {
    const refs = makeRefs();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) } as unknown as Response);
    const { result } = renderHook(() =>
      useGameSession({ mode: "easy", username: "test", filter: "", gameData: GAME_DATA_ONE_ROUND, mediumYearGuessing: false, currentIndex: 0, setCurrentIndex: vi.fn(), ...refs }),
    );

    await waitFor(() => {
      expect(refs.handleTimeoutRef.current).toBe(result.current.handleTimeout);
    });
  });
});
