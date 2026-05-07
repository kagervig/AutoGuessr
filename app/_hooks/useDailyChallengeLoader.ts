"use client";
// Fetches and bootstraps a daily challenge game session.
import { useEffect, useState } from "react";

export interface DailyChallengeRound {
  roundIndex: number;
  imageUrl: string;
  distractors: { vehicleId: string; label: string }[];
  bonusFlags: { isHardcore: boolean; isCotd: boolean; isRareFind: boolean };
}

export interface DailyChallengeData {
  sessionId: string;
  rounds: DailyChallengeRound[];
}

interface Params {
  date?: string;
  playerId?: string | null;
}

interface Result {
  data: DailyChallengeData | null;
  loading: boolean;
  error: string | null;
}

export function useDailyChallengeLoader({ date, playerId }: Params): Result {
  const [data, setData] = useState<DailyChallengeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (playerId) params.set("playerId", playerId);
    const query = params.toString();

    fetch(`/api/daily-challenge/session${query ? `?${query}` : ""}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((json: DailyChallengeData & { error?: string }) => {
        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
          json.rounds.slice(1).forEach((round) => {
            const link = document.createElement("link");
            link.rel = "prefetch";
            link.as = "image";
            link.href = round.imageUrl;
            document.head.appendChild(link);
          });
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== "AbortError") {
          setError("Failed to load daily challenge. Please try again.");
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [date, playerId]);

  return { data, loading, error };
}
