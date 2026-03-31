"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TIME_LIMITS } from "@/app/lib/game";
import MediumModeInput from "./MediumModeInput";
import HardModeInput from "./HardModeInput";

interface VehicleInfo {
  make: string;
  model: string;
  year: number;
}

interface RoundData {
  roundId: string;
  sequenceNumber: number;
  imageId: string;
  imageUrl: string;
  vehicleId: string;
  vehicle: VehicleInfo;
}

interface Choice {
  vehicleId: string;
  label: string;
}

interface GameData {
  sessionId: string;
  rounds: RoundData[];
  easyChoices?: Record<string, Choice[]>;
  makes?: string[];
  timeLimitMs?: number;
}

interface CompletedRound {
  imageUrl: string;
  correctLabel: string;
  isCorrect: boolean;
}

interface RevealInfo {
  correctLabel: string;
  guessLabel: string;
  isCorrect: boolean;
  pointsEarned: number;
}

interface Props {
  mode: string;
  username: string;
  filter: string;
}

const HARD_MODES = ["hard", "hardcore", "competitive"];
const CHOICE_MODES = ["easy", "practice"];

export default function GameScreen({ mode, username, filter }: Props) {
  const router = useRouter();

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mediumYearGuessing, setMediumYearGuessing] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [roundState, setRoundState] = useState<"answering" | "revealed">("answering");
  const [selectedEasyId, setSelectedEasyId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [reveal, setReveal] = useState<RevealInfo | null>(null);
  const [completedRounds, setCompletedRounds] = useState<CompletedRound[]>([]);
  const [practiceComplete, setPracticeComplete] = useState(false);

  // Competitive mode
  const [timerActive, setTimerActive] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState("50% 50%");
  const [zoomedOut, setZoomedOut] = useState(false);
  const autoSubmitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const roundStartRef = useRef<number>(Date.now());
  const currentRoundIdRef = useRef<string>("");

  useEffect(() => {
    const params = new URLSearchParams({ mode });
    if (username) params.set("username", username);
    if (filter) params.set("filter", filter);

    Promise.all([
      fetch(`/api/game?${params.toString()}`).then((r) => r.json()),
      fetch("/api/flags").then((r) => r.json()),
    ])
      .then(([game, flags]) => {
        if (game.error) {
          // "Not enough cars" errors are shown inline on the home screen
          if (typeof game.error === "string" && game.error.toLowerCase().includes("not enough")) {
            router.replace(`/?filterError=${encodeURIComponent(game.error)}`);
          } else {
            setError(game.error);
          }
        } else {
          setGameData(game);
          setMediumYearGuessing(flags?.medium_year_guessing === true);
        }
      })
      .catch(() => setError("Failed to load game. Please try again."))
      .finally(() => setLoading(false));
  }, [mode, username, filter]);

  // Reset per-round state when the round index changes
  useEffect(() => {
    roundStartRef.current = Date.now();
    if (gameData) currentRoundIdRef.current = gameData.rounds[currentIndex].roundId;
    setTimerActive(false);
    setZoomedOut(false);

    if (mode === "competitive" && gameData) {
      const x = Math.floor(Math.random() * 70 + 15);
      const y = Math.floor(Math.random() * 70 + 15);
      setZoomOrigin(`${x}% ${y}%`);

      // Double rAF to ensure initial scale is painted before transition starts
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => {
          setTimerActive(true);
          setZoomedOut(true);
        });
      });
    }

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (autoSubmitRef.current !== null) clearTimeout(autoSubmitRef.current);
    };
  }, [currentIndex, mode, gameData]);

  const handleTimeout = useCallback(() => {
    if (roundState !== "answering") return;
    const roundId = currentRoundIdRef.current;
    if (roundId) {
      fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId, rawInput: "", timeTakenMs: Date.now() - roundStartRef.current }),
      }).catch(() => {/* fire and forget */});
    }
    resolveAndReveal({ makeCorrect: false, modelCorrect: false, guessLabel: "", pointsEarned: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundState]);

  // Set competitive auto-submit after timer becomes active
  useEffect(() => {
    if (!timerActive || mode !== "competitive" || !gameData) return;
    const timeLimitMs = gameData.timeLimitMs ?? TIME_LIMITS.competitive;
    autoSubmitRef.current = setTimeout(handleTimeout, timeLimitMs);
    return () => { if (autoSubmitRef.current !== null) clearTimeout(autoSubmitRef.current); };
  }, [timerActive, mode, gameData, handleTimeout]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-900">
        <p className="text-zinc-500">Loading…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-900 px-4">
        <p className="text-center text-red-400">{error}</p>
        <button onClick={() => router.push("/")} className="rounded-lg bg-zinc-800 px-5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700">
          Back to home
        </button>
      </main>
    );
  }

  if (!gameData) return null;

  if (practiceComplete) {
    const correct = completedRounds.filter((r) => r.isCorrect).length;
    return (
      <main className="min-h-screen bg-zinc-900 px-4 py-8">
        <div className="mx-auto max-w-lg space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Practice complete</h1>
            <p className="mt-1 text-zinc-400">
              <span className="text-amber-400 font-semibold">{correct}</span> / {completedRounds.length} correct
            </p>
          </div>
          <div className="space-y-2">
            {completedRounds.map((r, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-800/50 px-3 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.imageUrl} alt="" className="h-12 w-16 flex-shrink-0 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className={`truncate text-sm font-medium ${r.isCorrect ? "text-zinc-200" : "text-zinc-400"}`}>
                    {r.correctLabel}
                  </p>
                </div>
                <span className={`text-lg ${r.isCorrect ? "text-green-400" : "text-red-400"}`}>
                  {r.isCorrect ? "✓" : "✗"}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push("/")} className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800">
              Home
            </button>
            <button onClick={() => router.push(`/game?mode=practice&username=${username}&filter=${filter}`)} className="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-bold text-zinc-900 hover:bg-amber-400">
              Play Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  const round = gameData.rounds[currentIndex];
  const choices = gameData.easyChoices?.[round.roundId] ?? [];
  const timeLimitMs = gameData.timeLimitMs ?? TIME_LIMITS[mode] ?? TIME_LIMITS.easy;
  const isLastRound = currentIndex === gameData.rounds.length - 1;

  function resolveAndReveal({
    makeCorrect,
    modelCorrect,
    guessLabel,
    pointsEarned,
  }: {
    makeCorrect: boolean;
    modelCorrect: boolean;
    guessLabel: string;
    pointsEarned: number;
  }) {
    if (autoSubmitRef.current !== null) {
      clearTimeout(autoSubmitRef.current);
      autoSubmitRef.current = null;
    }

    const { make, model, year } = round.vehicle;
    const correctLabel = HARD_MODES.includes(mode) ? `${year} ${make} ${model}` : `${make} ${model}`;

    setScore((s) => s + pointsEarned);
    setReveal({ correctLabel, guessLabel, isCorrect: makeCorrect && modelCorrect, pointsEarned });
    setCompletedRounds((prev) => [...prev, { imageUrl: round.imageUrl, correctLabel, isCorrect: makeCorrect && modelCorrect }]);
    setRoundState("revealed");
  }

  async function handleEasyAnswer(vehicleId: string) {
    if (roundState === "revealed") return;
    setSelectedEasyId(vehicleId);
    const elapsedMs = Date.now() - roundStartRef.current;
    const guessLabel = choices.find((c) => c.vehicleId === vehicleId)?.label ?? "";
    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId: round.roundId, rawInput: guessLabel, guessedVehicleId: vehicleId, timeTakenMs: elapsedMs }),
      });
      const data = await res.json();
      resolveAndReveal({ makeCorrect: data.makeMatch, modelCorrect: data.modelMatch, guessLabel, pointsEarned: data.pointsEarned });
    } catch {
      const isMatch = vehicleId === round.vehicleId;
      resolveAndReveal({ makeCorrect: isMatch, modelCorrect: isMatch, guessLabel, pointsEarned: 0 });
    }
  }

  async function handleMediumSubmit(make: string, model: string, year?: string) {
    if (roundState === "revealed") return;
    const elapsedMs = Date.now() - roundStartRef.current;
    const guessLabel = `${make} ${model}`;
    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundId: round.roundId,
          rawInput: guessLabel,
          guessedMake: make,
          guessedModel: model,
          guessedYear: year && mediumYearGuessing ? parseInt(year) || undefined : undefined,
          timeTakenMs: elapsedMs,
        }),
      });
      const data = await res.json();
      resolveAndReveal({ makeCorrect: data.makeMatch, modelCorrect: data.modelMatch, guessLabel, pointsEarned: data.pointsEarned });
    } catch {
      resolveAndReveal({ makeCorrect: false, modelCorrect: false, guessLabel, pointsEarned: 0 });
    }
  }

  async function handleHardSubmit(make: string, model: string, year: string) {
    if (roundState === "revealed") return;
    const elapsedMs = Date.now() - roundStartRef.current;
    const guessLabel = `${year} ${make} ${model}`.trim();
    if (!make && !model) {
      resolveAndReveal({ makeCorrect: false, modelCorrect: false, guessLabel: "", pointsEarned: 0 });
      return;
    }
    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundId: round.roundId,
          rawInput: guessLabel,
          guessedMake: make,
          guessedModel: model,
          guessedYear: parseInt(year) || undefined,
          timeTakenMs: elapsedMs,
        }),
      });
      const data = await res.json();
      resolveAndReveal({ makeCorrect: data.makeMatch, modelCorrect: data.modelMatch, guessLabel, pointsEarned: data.pointsEarned });
    } catch {
      resolveAndReveal({ makeCorrect: false, modelCorrect: false, guessLabel, pointsEarned: 0 });
    }
  }

  async function submitPracticeStats(roundResults: CompletedRound[]) {
    if (!username) return;
    const filterConfig = filter
      ? (() => { try { return JSON.parse(decodeURIComponent(filter)); } catch { return {}; } })()
      : {};
    const correct = roundResults.filter((r) => r.isCorrect).length;
    const incorrect = roundResults.length - correct;
    const dimensions: Array<{ type: string; key: string }> = [
      ...(filterConfig.categorySlugs ?? []).map((s: string) => ({ type: "category", key: s })),
      ...(filterConfig.regionSlugs ?? []).map((s: string) => ({ type: "region", key: s })),
      ...(filterConfig.countries ?? []).map((s: string) => ({ type: "country", key: s })),
    ];
    await Promise.all(
      dimensions.map((d) =>
        fetch("/api/practice/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, dimensionType: d.type, dimensionKey: d.key, correct, incorrect }),
        })
      )
    );
  }

  async function handleNext() {
    if (isLastRound) {
      if (mode === "practice") {
        await submitPracticeStats(completedRounds);
        setPracticeComplete(true);
        return;
      }
      await fetch("/api/session/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: gameData!.sessionId, finalScore: score }),
      });
      const params = new URLSearchParams({
        sessionId: gameData!.sessionId,
        mode,
        ...(username ? { username } : {}),
      });
      router.push(`/results?${params.toString()}`);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setRoundState("answering");
    setReveal(null);
    setSelectedEasyId(null);
  }

  const isHardcore = mode === "hardcore";
  const isCompetitive = mode === "competitive";

  return (
    <main className="flex min-h-screen flex-col bg-zinc-900">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm text-zinc-500">
          Round <span className="font-semibold text-zinc-300">{currentIndex + 1}</span> / {gameData.rounds.length}
        </span>
        <span className="text-sm font-semibold text-amber-400">
          {mode === "practice" ? "Practice" : `${score.toLocaleString()} pts`}
        </span>
      </div>

      {/* Image — 4:3 aspect ratio */}
      <div className="relative w-full overflow-hidden" style={{ paddingBottom: "75%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={round.imageUrl}
          src={round.imageUrl}
          alt="Identify this car"
          loading="eager"
          className="absolute inset-0 h-full w-full object-cover transition-[filter,transform]"
          style={{
            // Hardcore: blur until revealed
            filter: isHardcore && roundState === "answering"
              ? "blur(4px) brightness(0.7) contrast(1.2)"
              : "none",
            transitionDuration: isHardcore ? "300ms" : "0ms",
            // Competitive: zoom in then animate out
            ...(isCompetitive
              ? {
                  transformOrigin: zoomOrigin,
                  transform: zoomedOut ? "scale(1)" : "scale(8)",
                  transition: zoomedOut
                    ? `transform ${timeLimitMs}ms linear, filter 300ms`
                    : "none",
                }
              : {}),
          }}
        />
        <div className="absolute inset-0 -z-10 flex items-center justify-center bg-zinc-800">
          <span className="text-sm text-zinc-600">Image unavailable</span>
        </div>
      </div>

      {/* Competitive countdown bar */}
      {isCompetitive && (
        <div className="h-1 w-full bg-zinc-800">
          <div
            className="h-full bg-amber-500"
            style={{
              width: roundState === "revealed" ? "0%" : timerActive ? "0%" : "100%",
              transition: timerActive && roundState === "answering"
                ? `width ${timeLimitMs}ms linear`
                : "none",
            }}
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        {/* Easy / practice mode choices */}
        {CHOICE_MODES.includes(mode) && (
          <div className="grid grid-cols-1 gap-2">
            {choices.map((choice) => {
              const isSelected = selectedEasyId === choice.vehicleId;
              const isCorrectChoice = choice.vehicleId === round.vehicleId;
              let cls = "w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors";
              if (roundState === "answering") {
                cls += " border-zinc-700 bg-zinc-800 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-700";
              } else if (isCorrectChoice) {
                cls += " border-green-600 bg-green-900/30 text-green-300";
              } else if (isSelected) {
                cls += " border-red-600 bg-red-900/30 text-red-300";
              } else {
                cls += " border-zinc-800 bg-zinc-900 text-zinc-600";
              }
              return (
                <button key={choice.vehicleId} disabled={roundState === "revealed"} onClick={() => handleEasyAnswer(choice.vehicleId)} className={cls}>
                  {choice.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Medium mode */}
        {mode === "medium" && (
          <MediumModeInput
            makes={gameData.makes ?? []}
            showYear={mediumYearGuessing}
            disabled={roundState === "revealed"}
            onSubmit={handleMediumSubmit}
          />
        )}

        {/* Hard / hardcore / competitive */}
        {HARD_MODES.includes(mode) && (
          <HardModeInput
            makes={gameData.makes ?? []}
            disabled={roundState === "revealed"}
            onSubmit={handleHardSubmit}
          />
        )}

        {/* Reveal panel */}
        {roundState === "revealed" && reveal && (
          <div className="space-y-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3">
            <p className="text-xs text-zinc-500">Correct answer</p>
            <p className="text-base font-bold text-white">{reveal.correctLabel}</p>
            {!reveal.isCorrect && reveal.guessLabel && (
              <p className="text-sm text-red-400">You answered: {reveal.guessLabel}</p>
            )}
            {reveal.pointsEarned > 0 && (
              <p className="text-sm text-amber-400">+{reveal.pointsEarned.toLocaleString()} pts</p>
            )}
          </div>
        )}

        {roundState === "revealed" && (
          <button onClick={handleNext} className="w-full rounded-xl bg-amber-500 py-3.5 text-sm font-bold text-zinc-900 transition-colors hover:bg-amber-400">
            {isLastRound ? (mode === "practice" ? "See Summary" : "See Results") : "Next"}
          </button>
        )}
      </div>
    </main>
  );
}
