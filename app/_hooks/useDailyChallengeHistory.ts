"use client";
// Fetches the player's daily challenge history for a given month.
import { useEffect, useState } from "react";

export interface CalendarDayData {
  dateStr: string;
  state: "future" | "no-challenge" | "unplayed" | "played";
  score?: number;
  rank?: number;
  totalPlayers?: number;
}

export interface HistoryApiDay {
  date: string;
  challengeId: number;
  played: boolean;
  totalScore: number | null;
  rank: number | null;
  totalPlayers: number | null;
}

export function mapHistoryToDayData(
  apiDays: HistoryApiDay[],
  year: number,
  month: number,
  today: string,
): CalendarDayData[] {
  const totalDays = new Date(year, month, 0).getDate();
  const apiMap = new Map(apiDays.map((d) => [d.date, d]));

  return Array.from({ length: totalDays }, (_, i) => {
    const day = i + 1;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (dateStr > today) return { dateStr, state: "future" as const };

    const entry = apiMap.get(dateStr);
    if (!entry) return { dateStr, state: "no-challenge" as const };
    if (entry.played && entry.totalScore !== null && entry.rank !== null) {
      return {
        dateStr,
        state: "played" as const,
        score: entry.totalScore,
        rank: entry.rank,
        totalPlayers: entry.totalPlayers ?? undefined,
      };
    }
    return { dateStr, state: "unplayed" as const };
  });
}

interface Result {
  days: CalendarDayData[];
  loading: boolean;
  error: string | null;
}

interface FetchResult {
  key: string;
  days: CalendarDayData[];
  error: string | null;
}

export function useDailyChallengeHistory(
  year: number,
  month: number,
  playerId: string | null,
): Result {
  // Deriving `loading` from key staleness avoids synchronous setState in the effect body.
  const requestKey = `${year}-${String(month).padStart(2, "0")}-${playerId ?? ""}`;
  const [result, setResult] = useState<FetchResult | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    const key = `${monthStr}-${playerId ?? ""}`;
    const params = new URLSearchParams({ month: monthStr });
    if (playerId) params.set("playerId", playerId);
    const today = new Date().toISOString().slice(0, 10);

    fetch(`/api/daily-challenge/history?${params.toString()}`, { signal: controller.signal })
      .then(async (r) => {
        const json = (await r.json()) as { days?: HistoryApiDay[]; error?: string };
        if (json.error) {
          setResult({ key, days: [], error: json.error });
        } else if (json.days) {
          setResult({ key, days: mapHistoryToDayData(json.days, year, month, today), error: null });
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== "AbortError") {
          setResult({ key, days: [], error: "Failed to load challenge history." });
        }
      });

    return () => controller.abort();
  }, [year, month, playerId]);

  const isStale = result?.key !== requestKey;
  return {
    days: isStale ? [] : result!.days,
    loading: isStale,
    error: isStale ? null : result!.error,
  };
}
