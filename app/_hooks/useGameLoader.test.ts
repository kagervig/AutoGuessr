// @vitest-environment happy-dom
// Tests for useGameLoader.
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGameLoader } from "./useGameLoader";

const { mockReplace } = vi.hoisted(() => ({ mockReplace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
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

describe("useGameLoader", () => {
  beforeEach(() => {
    vi.resetAllMocks();
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

  it("sets error when the game response contains a non-filter error", async () => {
    mockFetch({ error: "Something went wrong" });
    const { result } = renderHook(() =>
      useGameLoader({ mode: "easy", username: "test", filter: "" }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Something went wrong");
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

  it("sets a generic error when the fetch rejects", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));
    const { result } = renderHook(() =>
      useGameLoader({ mode: "easy", username: "test", filter: "" }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Failed to load game. Please try again.");
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
});
