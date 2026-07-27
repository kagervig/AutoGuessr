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
  alreadyPlayed: boolean;
}

// Fetches the daily challenge session (round images, distractor choices, bonus flags) and prefetches subsequent round images in the background.
export function useDailyChallengeLoader({ date, playerId }: Params): Result {
  const [data, setData] = useState<DailyChallengeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (playerId) params.set("playerId", playerId);
    const query = params.toString();

    fetch(`/api/daily-challenge/session${query ? `?${query}` : ""}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        const status = r.status;
        const json = (await r.json()) as DailyChallengeData & { error?: string };
        if (json.error) {
          if (status === 403) {
            setAlreadyPlayed(true);
          } else {
            setError(json.error);
          }
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

  return { data, loading, error, alreadyPlayed };
}
