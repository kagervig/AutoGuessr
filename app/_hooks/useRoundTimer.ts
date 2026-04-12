"use client";
import { useEffect, useRef, useState } from "react";
import { shuffle, TIME_LIMITS } from "@/app/lib/game";
import type { GameData } from "./useGameLoader";

interface Params {
  mode: string;
  gameData: GameData | null;
  currentIndex: number;
  introVisible: boolean;
  onTimeout: React.MutableRefObject<() => void>;
}

interface Result {
  visiblePanels: boolean[];
  hasSubmittedRef: React.MutableRefObject<boolean>;
  roundStartRef: React.MutableRefObject<number>;
  currentRoundIdRef: React.MutableRefObject<string>;
  currentRoundImageUrlRef: React.MutableRefObject<string>;
  autoSubmitRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  panelIndexRef: React.MutableRefObject<number>;
  panelIntervalRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
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
      currentRoundIdRef.current = gameData.rounds[currentIndex].roundId;
      currentRoundImageUrlRef.current = gameData.rounds[currentIndex].imageUrl;
      const limit = gameData.timeLimitMs ?? TIME_LIMITS[mode];
      if (limit) {
        autoSubmitRef.current = setTimeout(() => onTimeout.current(), limit);
      }
    }

    if (mode === "hardcore") {
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
