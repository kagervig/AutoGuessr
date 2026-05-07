// @vitest-environment happy-dom
// Tests for useDailyChallengeSession.
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useDailyChallengeSession } from "./useDailyChallengeSession";
import type { DailyChallengeData } from "./useDailyChallengeLoader";

const DISTRACTOR_A = { vehicleId: "v-1", label: "Toyota Supra" };
const DISTRACTOR_B = { vehicleId: "v-2", label: "Nissan GT-R" };
const DISTRACTOR_C = { vehicleId: "v-3", label: "Honda NSX" };
const DISTRACTOR_D = { vehicleId: "v-4", label: "Mazda RX-7" };

const DATA: DailyChallengeData = {
  sessionId: "s-1",
  rounds: Array.from({ length: 10 }, (_, i) => ({
    roundIndex: i,
    imageUrl: `https://img.test/car-${i}.jpg`,
    distractors: [DISTRACTOR_A, DISTRACTOR_B, DISTRACTOR_C, DISTRACTOR_D],
    bonusFlags: { isHardcore: false, isCotd: false, isRareFind: false },
  })),
};

const GUESS_RESPONSE = {
  correct: true,
  correctVehicleId: "v-1",
  score: 1190,
  bonusesEarned: [],
  isFinal: false,
};

function mockFetch(response: unknown, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(response),
  } as Response);
}

function makeHook(data: DailyChallengeData | null = DATA) {
  let index = 0;
  const setIndex = vi.fn((updater: number | ((i: number) => number)) => {
    index = typeof updater === "function" ? updater(index) : updater;
  });
  return renderHook(() =>
    useDailyChallengeSession({ data, currentIndex: index, setCurrentIndex: setIndex }),
  );
}

describe("useDailyChallengeSession", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("starts in answering state with score 0", () => {
    const { result } = makeHook();
    expect(result.current.roundState).toBe("answering");
    expect(result.current.score).toBe(0);
    expect(result.current.reveal).toBeNull();
    expect(result.current.selectedChoiceId).toBeNull();
  });

  it("exposes the current round from data", () => {
    const { result } = makeHook();
    expect(result.current.round).toEqual(DATA.rounds[0]);
  });

  it("returns null round when data is null", () => {
    const { result } = makeHook(null);
    expect(result.current.round).toBeNull();
  });

  it("transitions to revealed after a correct answer", async () => {
    mockFetch(GUESS_RESPONSE);
    const { result } = makeHook();
    await act(() => result.current.handleAnswer("v-1"));
    expect(result.current.roundState).toBe("revealed");
    expect(result.current.reveal?.correct).toBe(true);
    expect(result.current.reveal?.correctLabel).toBe("Toyota Supra");
    expect(result.current.reveal?.score).toBe(1190);
  });

  it("transitions to revealed after an incorrect answer", async () => {
    mockFetch({ ...GUESS_RESPONSE, correct: false, correctVehicleId: "v-1", score: 0 });
    const { result } = makeHook();
    await act(() => result.current.handleAnswer("v-2"));
    expect(result.current.reveal?.correct).toBe(false);
    expect(result.current.reveal?.guessedLabel).toBe("Nissan GT-R");
    expect(result.current.reveal?.correctLabel).toBe("Toyota Supra");
  });

  it("accumulates score across rounds", async () => {
    mockFetch(GUESS_RESPONSE);
    const { result } = makeHook();
    await act(() => result.current.handleAnswer("v-1"));
    expect(result.current.score).toBe(1190);
  });

  it("sets selectedChoiceId on answer", async () => {
    mockFetch(GUESS_RESPONSE);
    const { result } = makeHook();
    await act(() => result.current.handleAnswer("v-2"));
    expect(result.current.selectedChoiceId).toBe("v-2");
  });

  it("ignores duplicate handleAnswer calls", async () => {
    mockFetch(GUESS_RESPONSE);
    const { result } = makeHook();
    await act(async () => {
      result.current.handleAnswer("v-1");
      result.current.handleAnswer("v-2");
    });
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
  });

  it("sets networkError and returns early on fetch failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));
    const { result } = makeHook();
    await act(() => result.current.handleAnswer("v-1"));
    expect(result.current.networkError).toBe(true);
    expect(result.current.roundState).toBe("answering");
  });

  it("includes bonusesEarned in reveal", async () => {
    mockFetch({
      ...GUESS_RESPONSE,
      bonusesEarned: [{ type: "hardcore", points: 1000 }],
    });
    const { result } = makeHook();
    await act(() => result.current.handleAnswer("v-1"));
    expect(result.current.reveal?.bonusesEarned).toEqual([{ type: "hardcore", points: 1000 }]);
  });

  it("handleNext advances to next round", async () => {
    mockFetch(GUESS_RESPONSE);
    const { result } = makeHook();
    await act(() => result.current.handleAnswer("v-1"));
    act(() => result.current.handleNext());
    await waitFor(() => expect(result.current.roundState).toBe("answering"));
    expect(result.current.reveal).toBeNull();
    expect(result.current.selectedChoiceId).toBeNull();
  });

  it("handleNext on final round transitions to complete", async () => {
    mockFetch({
      ...GUESS_RESPONSE,
      isFinal: true,
      totalScore: 10000,
      rank: 1,
      totalPlayers: 100,
      percentile: 99,
    });
    const { result } = makeHook();
    await act(() => result.current.handleAnswer("v-1"));
    expect(result.current.reveal?.isFinal).toBe(true);
    expect(result.current.reveal?.totalScore).toBe(10000);
    expect(result.current.reveal?.rank).toBe(1);
    act(() => result.current.handleNext());
    expect(result.current.roundState).toBe("complete");
  });

  it("submits sessionId and roundIndex to guess endpoint", async () => {
    mockFetch(GUESS_RESPONSE);
    const { result } = makeHook();
    await act(() => result.current.handleAnswer("v-1"));
    const body = JSON.parse((vi.mocked(global.fetch).mock.calls[0][1] as RequestInit).body as string);
    expect(body.sessionId).toBe("s-1");
    expect(body.roundIndex).toBe(0);
    expect(body.vehicleId).toBe("v-1");
  });
});
