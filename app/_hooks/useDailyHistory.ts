"use client";

import { useCallback, useState } from "react";

const DAILY_HISTORY_KEY = "ag_daily_history";

export function useDailyHistory() {
  const [history, setHistory] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    const stored = localStorage.getItem(DAILY_HISTORY_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    return {};
  });

  const recordGame = useCallback((date: string, gameId: string) => {
    setHistory((prev) => {
      const next = { ...prev, [date]: gameId };
      localStorage.setItem(DAILY_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getGameIdForDate = useCallback((date: string) => {
    return history[date] || null;
  }, [history]);

  return { history, recordGame, getGameIdForDate };
}
