"use client";
// Manages round state and guess submission for a daily challenge session.
import { useEffect, useRef, useState } from "react";
import type { DailyChallengeData, DailyChallengeRound } from "./useDailyChallengeLoader";

export interface DailyChallengeReveal {
  correct: boolean;
  correctLabel: string;
  guessedLabel: string;
  score: number;
  bonusesEarned: { type: string; points: number }[];
  isFinal: boolean;
  totalScore?: number;
  rank?: number;
  totalPlayers?: number;
  percentile?: number;
}

interface Params {
  data: DailyChallengeData | null;
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
}

interface Result {
  roundState: "answering" | "revealed" | "complete";
  selectedChoiceId: string | null;
  isSubmitting: boolean;
  score: number;
  reveal: DailyChallengeReveal | null;
  networkError: boolean;
  round: DailyChallengeRound | null;
  handleAnswer: (vehicleId: string) => Promise<void>;
  handleNext: () => void;
}

export function useDailyChallengeSession({ data, currentIndex, setCurrentIndex }: Params): Result {
  const [roundState, setRoundState] = useState<"answering" | "revealed" | "complete">("answering");
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [score, setScore] = useState(0);
  const [reveal, setReveal] = useState<DailyChallengeReveal | null>(null);
  const [networkError, setNetworkError] = useState(false);
  const hasSubmittedRef = useRef(false);
  const roundStartRef = useRef<number>(0);

  useEffect(() => {
    roundStartRef.current = Date.now();
  }, [currentIndex]);

  const round = data?.rounds[currentIndex] ?? null;

  async function handleAnswer(vehicleId: string) {
    if (!data || !round || hasSubmittedRef.current || roundState !== "answering") return;
    hasSubmittedRef.current = true;
    setSelectedChoiceId(vehicleId);
    setIsSubmitting(true);

    const timeTakenMs = Date.now() - roundStartRef.current;
    const guessedLabel = round.distractors.find((d) => d.vehicleId === vehicleId)?.label ?? "";

    let res: Response;
    try {
      res = await fetch("/api/daily-challenge/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: data.sessionId,
          roundIndex: currentIndex,
          vehicleId,
          timeTakenMs,
        }),
      });
    } catch {
      setNetworkError(true);
      setIsSubmitting(false);
      return;
    }

    if (!res.ok) {
      setIsSubmitting(false);
      return;
    }

    const json = await res.json() as {
      correct: boolean;
      correctVehicleId: string;
      score: number;
      bonusesEarned: { type: string; points: number }[];
      isFinal: boolean;
      totalScore?: number;
      rank?: number;
      totalPlayers?: number;
      percentile?: number;
    };

    const correctLabel =
      round.distractors.find((d) => d.vehicleId === json.correctVehicleId)?.label ??
      json.correctVehicleId;

    setScore((s) => s + json.score);
    setReveal({
      correct: json.correct,
      correctLabel,
      guessedLabel,
      score: json.score,
      bonusesEarned: json.bonusesEarned,
      isFinal: json.isFinal,
      totalScore: json.totalScore,
      rank: json.rank,
      totalPlayers: json.totalPlayers,
      percentile: json.percentile,
    });
    setIsSubmitting(false);
    setRoundState("revealed");
  }

  // Advances to the next round, or transitions to the completion state if the current reveal is the final round.
  function handleNext() {
    if (!data) return;
    if (reveal?.isFinal) {
      setRoundState("complete");
      return;
    }
    hasSubmittedRef.current = false;
    setCurrentIndex((i) => i + 1);
    setRoundState("answering");
    setReveal(null);
    setSelectedChoiceId(null);
    setIsSubmitting(false);
  }

  return {
    roundState,
    selectedChoiceId,
    isSubmitting,
    score,
    reveal,
    networkError,
    round,
    handleAnswer,
    handleNext,
  };
}
