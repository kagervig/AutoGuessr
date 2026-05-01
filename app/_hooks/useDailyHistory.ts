"use client";

import { useCallback, useEffect, useState } from "react";

const DAILY_HISTORY_KEY = "ag_daily_history";

export function useDailyHistory() {
  const [history, setHistory] = useState<Record<string, string>>({});

  useEffect(() => {
    const stored = localStorage.getItem(DAILY_HISTORY_KEY);
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch {
        setHistory({});
      }
    }
  }, []);

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
