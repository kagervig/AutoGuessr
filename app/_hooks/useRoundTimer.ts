"use client";
// Manages the per-round countdown timer, auto-submit timeout, and hardcore panel reveal interval.
import { useEffect, useRef, useState } from "react";
import { shuffle, TIME_LIMITS } from "@/app/lib/game";
import type { GameData } from "./useGameLoader";
import { GameMode } from "@/app/lib/constants";

interface Params {
  mode: string;
  gameData: GameData | null;
  currentIndex: number;
  introVisible: boolean;
  onTimeout: { current: () => void };
}

interface Result {
  visiblePanels: boolean[];
  hasSubmittedRef: { current: boolean };
  roundStartRef: { current: number };
  currentRoundIdRef: { current: string };
  currentRoundImageUrlRef: { current: string };
  autoSubmitRef: { current: ReturnType<typeof setTimeout> | null };
  panelIndexRef: { current: number };
  panelIntervalRef: { current: ReturnType<typeof setInterval> | null };
}

export function useRoundTimer({
  mode,
  gameData,
  currentIndex,
  introVisible,
  onTimeout,
}: Params): Result {
  const [visiblePanels, setVisiblePanels] = useState<boolean[]>(
    Array(9).fill(true),
  );

  const autoSubmitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundStartRef = useRef<number>(0);
  const currentRoundIdRef = useRef<string>("");
  const currentRoundImageUrlRef = useRef<string>("");
  // Synchronously set to true the moment any submission begins so that
  // concurrent handlers (timer vs. user click) cannot both proceed.
  const hasSubmittedRef = useRef(false);
  const panelOrderRef = useRef<number[]>([]);
  const panelIndexRef = useRef(0);
  const panelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (introVisible) return;

    hasSubmittedRef.current = false;
    roundStartRef.current = Date.now();
    if (gameData) {
      const currentRound = gameData.rounds[currentIndex];
      if (!currentRound) {
        console.error("[useRoundTimer] currentIndex out of bounds:", currentIndex, { total: gameData.rounds.length });
        return;
      }
      currentRoundIdRef.current = currentRound.roundId;
      currentRoundImageUrlRef.current = currentRound.imageUrl;
      const limit = gameData.timeLimitMs ?? TIME_LIMITS[mode as GameMode];
      if (limit) {
        autoSubmitRef.current = setTimeout(() => onTimeout.current(), limit);
      }
    }

    if (mode === GameMode.Hardcore) {
      const order = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      const initialPanels = Array(9).fill(true);
      initialPanels[order[0]] = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- random order must be set per round; not derivable during render
      setVisiblePanels(initialPanels);
      panelOrderRef.current = order;
      panelIndexRef.current = 1;
      panelIntervalRef.current = setInterval(() => {
        const idx = panelOrderRef.current[panelIndexRef.current];
        panelIndexRef.current++;
        if (idx !== undefined) {
          setVisiblePanels((prev) => {
            const next = [...prev];
            next[idx] = false;
            return next;
          });
        }
      }, 5000);
    }

    return () => {
      if (autoSubmitRef.current !== null) clearTimeout(autoSubmitRef.current);
      if (panelIntervalRef.current !== null)
        clearInterval(panelIntervalRef.current);
    };
  }, [currentIndex, mode, gameData, introVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    visiblePanels,
    hasSubmittedRef,
    roundStartRef,
    currentRoundIdRef,
    currentRoundImageUrlRef,
    autoSubmitRef,
    panelIndexRef,
    panelIntervalRef,
  };
}
