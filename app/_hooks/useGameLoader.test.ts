// @vitest-environment happy-dom
// Tests for useGameLoader.
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGameLoader } from "./useGameLoader";

// router must be a stable reference — a new object per render would cause the effect to re-run
const { mockReplace, mockRouter } = vi.hoisted(() => {
  const mockReplace = vi.fn();
  return { mockReplace, mockRouter: { replace: mockReplace, push: vi.fn() } };
});

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

const GAME_DATA = {
  gameId: "game-1",
  rounds: [
    {
      roundId: "round-1",
      sequenceNumber: 1,
      imageId: "img-1",
      imageUrl: "https://example.com/car.jpg",
    },
  ],
};

const MULTI_ROUND_GAME_DATA = {
  gameId: "game-1",
  rounds: [
    { roundId: "round-1", sequenceNumber: 1, imageId: "img-1", imageUrl: "https://example.com/car1.jpg" },
    { roundId: "round-2", sequenceNumber: 2, imageId: "img-2", imageUrl: "https://example.com/car2.jpg" },
    { roundId: "round-3", sequenceNumber: 3, imageId: "img-3", imageUrl: "https://example.com/car3.jpg" },
  ],
};

function mockFetch(game: unknown, flags: unknown = {}) {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.startsWith("/api/game")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(game) } as Response);
    }
    if (url === "/api/flags") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(flags) } as Response);
    }
    return Promise.reject(new Error(`Unexpected fetch: ${url}`));
  });
}

type MockImageInstance = { onload: (() => void) | null; onerror: (() => void) | null; src: string };
const imageInstances: MockImageInstance[] = [];

describe("useGameLoader", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
    imageInstances.length = 0;

    // Auto-fires onload when src is set — keeps existing tests working without changes
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        private _src = "";

        get src() {
          return this._src;
        }
        set src(val: string) {
          this._src = val;
          if (val) Promise.resolve().then(() => this.onload?.());
        }

        constructor() {
          imageInstances.push(this as unknown as MockImageInstance);
        }
      },
    );
  });

  it("returns loading state before fetches resolve", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() =>
      useGameLoader({ mode: "easy", username: "test", filter: "" }),
    );
    expect(result.current.loading).toBe(true);
    expect(result.current.gameData).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.mediumYearGuessing).toBe(false);
  });

  it("returns game data and sets loading to false on success", async () => {
    mockFetch(GAME_DATA);
    const { result } = renderHook(() =>
      useGameLoader({ mode: "easy", username: "test", filter: "" }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.gameData).toEqual(GAME_DATA);
    expect(result.current.error).toBeNull();
  });

  it("reads mediumYearGuessing from the flags response", async () => {
    mockFetch(GAME_DATA, { medium_year_guessing: true });
    const { result } = renderHook(() =>
      useGameLoader({ mode: "easy", username: "test", filter: "" }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.mediumYearGuessing).toBe(true);
  });

  it("retries automatically on first error and loads game when retry succeeds", async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.startsWith("/api/game")) {
        callCount++;
        const response = callCount === 1 ? { error: "Server error" } : GAME_DATA;
        return Promise.resolve({ ok: true, json: () => Promise.resolve(response) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    });
    const { result } = renderHook(() =>
      useGameLoader({ mode: "easy", username: "test", filter: "" }),
    );
    await waitFor(() => expect(result.current.gameData).toEqual(GAME_DATA));
    expect(result.current.retrying).toBe(false);
    expect(result.current.error).toBeNull();
    // Verify a second /api/game request was made for the retry
    const gameFetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([url]: string[]) => url.startsWith("/api/game"),
    );
    expect(gameFetchCalls).toHaveLength(2);
  });

  it("sets error after retry also fails", async () => {
    mockFetch({ error: "Something went wrong" });
    const { result } = renderHook(() =>
      useGameLoader({ mode: "easy", username: "test", filter: "" }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Something went wrong");
    expect(result.current.retrying).toBe(false);
    expect(result.current.gameData).toBeNull();
  });

  it("calls router.replace with the filter error when the error includes 'not enough'", async () => {
    mockFetch({ error: "not enough vehicles in this filter" });
    renderHook(() =>
      useGameLoader({ mode: "easy", username: "test", filter: "" }),
    );
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        "/?filterError=not%20enough%20vehicles%20in%20this%20filter",
      ),
    );
  });

  it("sets a generic error when both the fetch and its retry reject", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));
    const { result } = renderHook(() =>
      useGameLoader({ mode: "easy", username: "test", filter: "" }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Failed to load game. Please try again.");
    expect(result.current.retrying).toBe(false);
  });

  it("includes cf_token in the game request when provided", async () => {
    mockFetch(GAME_DATA);
    const { result } = renderHook(() =>
      useGameLoader({ mode: "easy", username: "test", filter: "", cfToken: "abc123" }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      ([url]: string[]) => url.startsWith("/api/game"),
    );
    expect(fetchCall![0]).toContain("cf_token=abc123");
  });

  it("loading remains true until the first image fires onload", async () => {
    // Paused mock — src setter does not auto-fire onload
    imageInstances.length = 0;
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = "";
        constructor() {
          imageInstances.push(this as unknown as MockImageInstance);
        }
      },
    );

    mockFetch(GAME_DATA);
    const { result } = renderHook(() =>
      useGameLoader({ mode: "easy", username: "test", filter: "" }),
    );

    // Fetches resolved but first image is still pending
    await waitFor(() => expect(imageInstances).toHaveLength(1));
    expect(result.current.loading).toBe(true);
    expect(result.current.gameData).toBeNull();

    act(() => imageInstances[0].onload?.());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.gameData).toEqual(GAME_DATA);
  });

  it("loading becomes false even when the first image fails to load", async () => {
    // Fires onerror instead of onload
    imageInstances.length = 0;
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        private _src = "";

        get src() {
          return this._src;
        }
        set src(val: string) {
          this._src = val;
          if (val) Promise.resolve().then(() => this.onerror?.());
        }

        constructor() {
          imageInstances.push(this as unknown as MockImageInstance);
        }
      },
    );

    mockFetch(GAME_DATA);
    const { result } = renderHook(() =>
      useGameLoader({ mode: "easy", username: "test", filter: "" }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.gameData).toEqual(GAME_DATA);
    expect(result.current.error).toBeNull();
  });

  it("background-loads remaining images after the first image loads", async () => {
    mockFetch(MULTI_ROUND_GAME_DATA);
    const { result } = renderHook(() =>
      useGameLoader({ mode: "easy", username: "test", filter: "" }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(imageInstances).toHaveLength(3);
    expect(imageInstances[1].src).toBe("https://example.com/car2.jpg");
    expect(imageInstances[2].src).toBe("https://example.com/car3.jpg");
  });

  it("clears image preload refs on unmount", async () => {
    // Paused mock — image stays pending until we unmount
    imageInstances.length = 0;
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = "";
        constructor() {
          imageInstances.push(this as unknown as MockImageInstance);
        }
      },
    );

    mockFetch(GAME_DATA);
    const { unmount } = renderHook(() =>
      useGameLoader({ mode: "easy", username: "test", filter: "" }),
    );

    await waitFor(() => expect(imageInstances).toHaveLength(1));
    expect(imageInstances[0].src).toBe("https://example.com/car.jpg");

    unmount();
    expect(imageInstances[0].src).toBe("");

    // Firing onload after unmount should be a no-op due to the cancelled flag
    expect(() => imageInstances[0].onload?.()).not.toThrow();
  });
});
