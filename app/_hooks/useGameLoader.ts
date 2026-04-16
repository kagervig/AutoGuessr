"use client";
// Fetches game data and feature flags for a game session.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface RoundData {
  roundId: string;
  sequenceNumber: number;
  imageId: string;
  imageUrl: string;
}

interface Choice {
  vehicleId: string;
  label: string;
}

export interface GameData {
  gameId: string;
  rounds: RoundData[];
  easyChoices?: Record<string, Choice[]>;
  makes?: string[];
  timeLimitMs?: number;
}

interface Params {
  mode: string;
  username: string;
  filter: string;
  cfToken?: string;
}

interface Result {
  gameData: GameData | null;
  loading: boolean;
  error: string | null;
  mediumYearGuessing: boolean;
  retrying: boolean;
}

export function useGameLoader({ mode, username, filter, cfToken }: Params): Result {
  const router = useRouter();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mediumYearGuessing, setMediumYearGuessing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ mode });
    if (username) params.set("username", username);
    if (filter) params.set("filter", filter);
    if (cfToken) params.set("cf_token", cfToken);

    Promise.all([
      fetch(`/api/game?${params.toString()}`, { signal: controller.signal }).then((r) =>
        r.json(),
      ),
      fetch("/api/flags", { signal: controller.signal }).then((r) => r.json()),
    ])
      .then(([game, flags]) => {
        if (game.error) {
          if (
            typeof game.error === "string" &&
            game.error.toLowerCase().includes("not enough")
          ) {
            router.replace(`/?filterError=${encodeURIComponent(game.error)}`);
          } else if (attempt === 0) {
            setRetrying(true);
            setAttempt(1);
          } else {
            setRetrying(false);
            setError(game.error);
            setLoading(false);
          }
        } else {
          setRetrying(false);
          setGameData(game);
          setMediumYearGuessing(flags?.medium_year_guessing === true);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("[GameScreen] Failed to load game:", err);
          if (attempt === 0) {
            setRetrying(true);
            setAttempt(1);
          } else {
            setRetrying(false);
            setError("Failed to load game. Please try again.");
            setLoading(false);
          }
        }
      });

    return () => controller.abort();
    // NOTE: cfToken intentionally omitted — adding it would re-fetch and restart the game
    // after Turnstile verification. It is only needed on the initial load.
  }, [mode, username, filter, router, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  return { gameData, loading, error, mediumYearGuessing, retrying };
}
