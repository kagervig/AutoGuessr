"use client";
// Manages all round-level state and handlers for an active game session.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GameData } from "./useGameLoader";
import type { RevealInfo, PointsBreakdown } from "@/app/_components/RoundResult";
import { GameMode } from "@/app/lib/constants";

const HARD_MODES: GameMode[] = [GameMode.Standard, GameMode.Hardcore, GameMode.TimeAttack];

const MAX_MULTIPLIERS: Record<GameMode, number> = {
  [GameMode.Easy]: 1.0,
  [GameMode.Custom]: 1.3,
  [GameMode.Standard]: 1.7,
  [GameMode.Hardcore]: 2.2,
  [GameMode.TimeAttack]: 2.0,
  [GameMode.Practice]: 1.0,
  [GameMode.Daily]: 1.7,
};

// A single retry absorbs transient network blips (mobile handoff, Wi-Fi reconnect).
async function fetchWithRetry(
  input: string,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err) {
    if (!(err instanceof TypeError)) throw err;
    console.error("[fetchWithRetry] First attempt failed, retrying once:", err);
    return await fetch(input, init);
  }
}

interface VehicleInfo {
  make: string;
  model: string;
  year: number;
}

interface CompletedRound {
  imageUrl: string;
  correctLabel: string;
  isCorrect: boolean;
}

interface Params {
  mode: string;
  username: string;
  filter: string;
  gameData: GameData | null;
  mediumYearGuessing: boolean;
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  handleTimeoutRef: { current: () => void };
  hasSubmittedRef: { current: boolean };
  roundStartRef: { current: number };
  currentRoundIdRef: { current: string };
  currentRoundImageUrlRef: { current: string };
  autoSubmitRef: { current: ReturnType<typeof setTimeout> | null };
  panelIndexRef: { current: number };
  panelIntervalRef: { current: ReturnType<typeof setInterval> | null };
}

interface Result {
  roundState: "answering" | "revealed";
  selectedEasyId: string | null;
  isSubmitting: boolean;
  score: number;
  reveal: RevealInfo | null;
  completedRounds: CompletedRound[];
  practiceComplete: boolean;
  networkError: boolean;
  imageRating: "up" | "down" | null;
  imageReported: boolean;
  maxTotalScore: number;
  round: GameData["rounds"][number] | null;
  choices: { vehicleId: string; label: string }[];
  isLastRound: boolean;
  handleTimeout: () => Promise<void>;
  handleEasyAnswer: (vehicleId: string) => Promise<void>;
  handleMediumSubmit: (make: string, model: string, year?: string) => Promise<void>;
  handleHardSubmit: (make: string, model: string, year: string) => Promise<void>;
  handleNext: () => Promise<void>;
  handleRateImage: (value: "up" | "down") => Promise<void>;
  handleReportImage: () => Promise<void>;
}

export function useGameSession({
  mode,
  username,
  filter,
  gameData,
  mediumYearGuessing,
  currentIndex,
  setCurrentIndex,
  handleTimeoutRef,
  hasSubmittedRef,
  roundStartRef,
  currentRoundIdRef,
  currentRoundImageUrlRef,
  autoSubmitRef,
  panelIndexRef,
  panelIntervalRef,
}: Params): Result {
  const router = useRouter();

  const [roundState, setRoundState] = useState<"answering" | "revealed">("answering");
  const [selectedEasyId, setSelectedEasyId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [score, setScore] = useState(0);
  const [reveal, setReveal] = useState<RevealInfo | null>(null);
  const [completedRounds, setCompletedRounds] = useState<CompletedRound[]>([]);
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [imageRating, setImageRating] = useState<"up" | "down" | null>(null);
  const [imageReported, setImageReported] = useState(false);

  const round = gameData?.rounds[currentIndex] ?? null;
  const choices = round ? (gameData?.easyChoices?.[round.roundId] ?? []) : [];
  const isLastRound = gameData ? currentIndex === gameData.rounds.length - 1 : false;
  const maxTotalScore = gameData
    ? gameData.rounds.length * Math.floor(1000 * (MAX_MULTIPLIERS[mode as GameMode] ?? 1.0))
    : 0;

  // resolveAndReveal is used by both handleTimeout and submitGuess, so we
  // need a stable ref to avoid stale closure issues in handleTimeout.
  const resolveAndRevealRef = useRef<(args: {
    imageUrl: string;
    makeCorrect: boolean;
    modelCorrect: boolean;
    guessLabel: string;
    pointsEarned: number;
    vehicle?: VehicleInfo;
    breakdown?: PointsBreakdown;
  }) => void>(() => {});

  function resolveAndReveal({
    imageUrl,
    makeCorrect,
    modelCorrect,
    guessLabel,
    pointsEarned,
    vehicle,
    breakdown,
  }: {
    imageUrl: string;
    makeCorrect: boolean;
    modelCorrect: boolean;
    guessLabel: string;
    pointsEarned: number;
    vehicle?: VehicleInfo;
    breakdown?: PointsBreakdown;
  }) {
    if (autoSubmitRef.current !== null) {
      clearTimeout(autoSubmitRef.current);
      autoSubmitRef.current = null;
    }
    if (panelIntervalRef.current !== null) {
      clearInterval(panelIntervalRef.current);
      panelIntervalRef.current = null;
    }

    const make = vehicle?.make ?? "";
    const model = vehicle?.model ?? "";
    const year = vehicle?.year ?? 0;
    const correctLabel = HARD_MODES.includes(mode as GameMode)
      ? `${year} ${make} ${model}`.trim()
      : `${make} ${model}`.trim();

    setIsSubmitting(false);
    setScore((s) => s + pointsEarned);
    setReveal({
      correctLabel,
      guessLabel,
      isCorrect: makeCorrect && modelCorrect,
      pointsEarned,
      breakdown,
    });
    setCompletedRounds((prev) => [
      ...prev,
      { imageUrl, correctLabel, isCorrect: makeCorrect && modelCorrect },
    ]);
    setRoundState("revealed");
  }

  resolveAndRevealRef.current = resolveAndReveal;

  async function submitGuess(body: Record<string, unknown>, guessLabel: string, imageUrl: string) {
    let res: Response;
    try {
      res = await fetchWithRetry("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      setNetworkError(true);
      return;
    }
    if (res.status === 401) {
      router.push("/");
      return;
    }
    if (!res.ok) {
      resolveAndRevealRef.current({
        imageUrl,
        makeCorrect: false,
        modelCorrect: false,
        guessLabel,
        pointsEarned: 0,
      });
      return;
    }
    const data = await res.json();
    resolveAndRevealRef.current({
      imageUrl,
      makeCorrect: data.makeMatch,
      modelCorrect: data.modelMatch,
      guessLabel,
      pointsEarned: data.pointsEarned,
      vehicle: data.vehicle,
      breakdown: {
        makePoints: data.makePoints,
        modelPoints: data.modelPoints,
        yearBonus: data.yearBonus,
        yearDelta: data.yearDelta,
        timeBonus: data.timeBonus,
        modeMultiplier: data.modeMultiplier,
        proBonus: data.proBonus,
        dailyDiscoveryBonus: data.dailyDiscoveryBonus ?? 0,
      },
    });
  }

  const handleTimeout = useCallback(async () => {
    if (roundState !== "answering" || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    const roundId = currentRoundIdRef.current;
    let vehicle: VehicleInfo | undefined;
    if (roundId) {
      try {
        const res = await fetch("/api/guess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roundId,
            rawInput: "",
            timeTakenMs: Date.now() - roundStartRef.current,
          }),
        });
        if (res.status === 401) {
          router.push("/");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          vehicle = data.vehicle;
        }
      } catch (err) {
        // Timeout submits are best-effort — a failure here is non-fatal because
        // resolveAndReveal will proceed with an empty vehicle label.
        console.error("[GameScreen] Timeout guess submission failed:", err);
      }
    }
    resolveAndRevealRef.current({
      imageUrl: currentRoundImageUrlRef.current,
      makeCorrect: false,
      modelCorrect: false,
      guessLabel: "",
      pointsEarned: 0,
      vehicle,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundState]);

  // Keep handleTimeoutRef in sync with the latest handleTimeout so useRoundTimer
  // can schedule it without taking a dependency on roundState (which would restart
  // the timer on every state change mid-round).
  useEffect(() => {
    handleTimeoutRef.current = handleTimeout;
  }, [handleTimeout, handleTimeoutRef]);

  async function handleEasyAnswer(vehicleId: string) {
    if (roundState === "revealed" || hasSubmittedRef.current) return;
    if (!round) return;
    hasSubmittedRef.current = true;
    setSelectedEasyId(vehicleId);
    setIsSubmitting(true);
    const elapsedMs = Date.now() - roundStartRef.current;
    const guessLabel = choices.find((c) => c.vehicleId === vehicleId)?.label ?? "";
    await submitGuess(
      { roundId: round.roundId, rawInput: guessLabel, guessedVehicleId: vehicleId, timeTakenMs: elapsedMs },
      guessLabel,
      round.imageUrl,
    );
  }

  async function handleMediumSubmit(make: string, model: string, year?: string) {
    if (roundState === "revealed" || hasSubmittedRef.current) return;
    if (!round) return;
    hasSubmittedRef.current = true;
    const elapsedMs = Date.now() - roundStartRef.current;
    const guessLabel = `${make} ${model}`;
    await submitGuess(
      {
        roundId: round.roundId,
        rawInput: guessLabel,
        guessedMake: make,
        guessedModel: model,
        guessedYear: year && mediumYearGuessing ? parseInt(year) || undefined : undefined,
        timeTakenMs: elapsedMs,
      },
      guessLabel,
      round.imageUrl,
    );
  }

  async function handleHardSubmit(make: string, model: string, year: string) {
    if (roundState === "revealed" || hasSubmittedRef.current) return;
    if (!round) return;
    hasSubmittedRef.current = true;
    const elapsedMs = Date.now() - roundStartRef.current;
    const guessLabel = `${year} ${make} ${model}`.trim();
    if (!make && !model) {
      resolveAndReveal({
        imageUrl: round.imageUrl,
        makeCorrect: false,
        modelCorrect: false,
        guessLabel: "",
        pointsEarned: 0,
      });
      return;
    }
    await submitGuess(
      {
        roundId: round.roundId,
        rawInput: guessLabel,
        guessedMake: make,
        guessedModel: model,
        guessedYear: parseInt(year) || undefined,
        timeTakenMs: elapsedMs,
        panelsRevealed: mode === GameMode.Hardcore ? panelIndexRef.current : undefined,
      },
      guessLabel,
      round.imageUrl,
    );
  }

  async function submitPracticeStats(roundResults: CompletedRound[]) {
    if (!username) return;
    const filterConfig = filter
      ? (() => {
          try {
            return JSON.parse(decodeURIComponent(filter));
          } catch {
            return {};
          }
        })()
      : {};
    const correct = roundResults.filter((r) => r.isCorrect).length;
    const incorrect = roundResults.length - correct;
    const dimensions: Array<{ type: string; key: string }> = [
      ...(filterConfig.categorySlugs ?? []).map((s: string) => ({ type: "category", key: s })),
      ...(filterConfig.regionSlugs ?? []).map((s: string) => ({ type: "region", key: s })),
      ...(filterConfig.countries ?? []).map((s: string) => ({ type: "country", key: s })),
    ];
    try {
      await Promise.all(
        dimensions.map((d) =>
          fetch("/api/practice/stats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, dimensionType: d.type, dimensionKey: d.key, correct, incorrect }),
          }),
        ),
      );
    } catch (err) {
      // Stats are best-effort — a failure here should not block the results screen.
      console.error("[GameScreen] Failed to submit practice stats:", err);
    }
  }

  async function handleNext() {
    if (isLastRound) {
      if (mode === GameMode.Practice) {
        await submitPracticeStats(completedRounds);
        setPracticeComplete(true);
        return;
      }
      try {
        const endRes = await fetch("/api/session/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: gameData!.gameId, finalScore: score }),
        });
        if (endRes.status === 401) {
          router.push("/");
          return;
        }
        if (!endRes.ok) {
          console.error("[GameScreen] Failed to end session:", endRes.status);
        }
      } catch (err) {
        // A network failure here should not strand the user — navigate to results anyway.
        console.error("[GameScreen] Failed to end session:", err);
      }
      const params = new URLSearchParams({
        gameId: gameData!.gameId,
        mode,
        maxScore: String(maxTotalScore),
        ...(username ? { username } : {}),
      });
      router.push(`/results?${params.toString()}`);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setRoundState("answering");
    setReveal(null);
    setSelectedEasyId(null);
    setIsSubmitting(false);
    setImageRating(null);
    setImageReported(false);
  }

  async function handleRateImage(value: "up" | "down") {
    const next = imageRating === value ? null : value;
    setImageRating(next);
    if (next === null || !round) return;
    await fetch(`/api/image/${round.imageId}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: next === "up" ? 1 : -1 }),
    });
  }

  async function handleReportImage() {
    if (imageReported || !round) return;
    setImageReported(true);
    await fetch(`/api/image/${round.imageId}/report`, { method: "POST" });
  }

  return {
    roundState,
    selectedEasyId,
    isSubmitting,
    score,
    reveal,
    completedRounds,
    practiceComplete,
    networkError,
    imageRating,
    imageReported,
    maxTotalScore,
    round,
    choices,
    isLastRound,
    handleTimeout,
    handleEasyAnswer,
    handleMediumSubmit,
    handleHardSubmit,
    handleNext,
    handleRateImage,
    handleReportImage,
  };
}
