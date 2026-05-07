// @vitest-environment happy-dom
// Tests for useDailyChallengeLoader.
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useDailyChallengeLoader } from "./useDailyChallengeLoader";

const SESSION_DATA = {
  sessionId: "s-1",
  rounds: [
    {
      roundIndex: 0,
      imageUrl: "https://img.test/car-0.jpg",
      distractors: [],
      bonusFlags: { isHardcore: false, isCotd: false, isRareFind: false },
    },
    {
      roundIndex: 1,
      imageUrl: "https://img.test/car-1.jpg",
      distractors: [],
      bonusFlags: { isHardcore: false, isCotd: false, isRareFind: false },
    },
  ],
};

function mockFetch(response: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(response),
  } as Response);
}

describe("useDailyChallengeLoader", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    document.head.innerHTML = "";
  });

  it("returns loading=true before fetch resolves", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useDailyChallengeLoader({}));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("returns session data on success", async () => {
    mockFetch(SESSION_DATA);
    const { result } = renderHook(() => useDailyChallengeLoader({}));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(SESSION_DATA);
    expect(result.current.error).toBeNull();
  });

  it("sets error when response contains an error field", async () => {
    mockFetch({ error: "You have already played this challenge." });
    const { result } = renderHook(() => useDailyChallengeLoader({}));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("You have already played this challenge.");
    expect(result.current.data).toBeNull();
  });

  it("sets generic error on network failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));
    const { result } = renderHook(() => useDailyChallengeLoader({}));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Failed to load daily challenge. Please try again.");
  });

  it("includes date param in request when provided", async () => {
    mockFetch(SESSION_DATA);
    const { result } = renderHook(() => useDailyChallengeLoader({ date: "2025-01-01" }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
      expect.stringContaining("date=2025-01-01"),
      expect.any(Object),
    );
  });

  it("includes playerId param in request when provided", async () => {
    mockFetch(SESSION_DATA);
    const { result } = renderHook(() => useDailyChallengeLoader({ playerId: "player-1" }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
      expect.stringContaining("playerId=player-1"),
      expect.any(Object),
    );
  });

  it("prefetches images for rounds after the first", async () => {
    mockFetch(SESSION_DATA);
    const { result } = renderHook(() => useDailyChallengeLoader({}));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const links = document.head.querySelectorAll('link[rel="prefetch"][as="image"]');
    const hrefs = Array.from(links).map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("https://img.test/car-1.jpg");
    expect(hrefs).not.toContain("https://img.test/car-0.jpg");
  });
});
