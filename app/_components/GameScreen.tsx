"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  Check,
  X,
  Zap,
  Star,
  Flag,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { TIME_LIMITS, shuffle } from "@/app/lib/game";
import { MODES } from "@/app/lib/constants";
import { Tachometer } from "@/app/components/ui/Tachometer";
import { cn } from "@/app/lib/utils";
import CustomModeInput from "./CustomModeInput";
import StandardModeInput from "./StandardModeInput";

const MODE_LABELS: Record<string, string> = Object.fromEntries(
  MODES.map((m) => [m.id, m.label])
);

// Approximate max per-round score for tachometer calibration
const MAX_MULTIPLIERS: Record<string, number> = {
  easy: 1.0,
  custom: 1.3,
  standard: 1.7,
  hardcore: 2.2,
  time_attack: 2.0,
  practice: 1.0,
};

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
}

interface Choice {
  vehicleId: string;
  label: string;
}

interface GameData {
  gameId: string;
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

interface PointsBreakdown {
  makePoints: number;
  modelPoints: number;
  yearBonus: number | null;
  timeBonus: number;
  modeMultiplier: number;
  proBonus: number;
}

interface RevealInfo {
  correctLabel: string;
  guessLabel: string;
  isCorrect: boolean;
  pointsEarned: number;
  breakdown?: PointsBreakdown;
}

interface Props {
  mode: string;
  username: string;
  filter: string;
  cfToken?: string;
}

const HARD_MODES = ["standard", "hardcore", "time_attack"];
const CHOICE_MODES = ["easy", "practice", "custom"];

// ─── RoundResult overlay ───────────────────────────────────────────────────

function RoundResult({
  reveal,
  round,
  totalRounds,
  totalScore,
  onNext,
}: {
  reveal: RevealInfo;
  round: number;
  totalRounds: number;
  totalScore: number;
  onNext: () => void;
}) {
  const isLast = round >= totalRounds;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="text-center max-w-sm w-full px-6 overflow-y-auto max-h-screen py-6"
      >
        <div className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl",
          reveal.isCorrect ? "bg-green-500/20 shadow-green-500/30" : "bg-red-600/20 shadow-red-600/30"
        )}>
          {reveal.isCorrect
            ? <Check className="w-10 h-10 text-green-400" strokeWidth={3} />
            : <X className="w-10 h-10 text-red-400" strokeWidth={3} />
          }
        </div>

        <p className={cn(
          "text-2xl font-black tracking-widest uppercase mb-1",
          reveal.isCorrect ? "text-green-400" : "text-red-400"
        )}>
          {reveal.isCorrect ? "Nailed it!" : "Miss!"}
        </p>

        <p className="text-sm text-muted-foreground mb-1">{reveal.correctLabel}</p>
        {!reveal.isCorrect && reveal.guessLabel && (
          <p className="text-xs text-red-400/70 mb-4">You said: {reveal.guessLabel}</p>
        )}
        {reveal.isCorrect && <div className="mb-4" />}

        {reveal.pointsEarned > 0 && reveal.breakdown ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 mb-6 text-left"
          >
            <div className="space-y-1 text-sm font-mono">
              {reveal.breakdown.makePoints > 0 && (
                <div className="flex justify-between text-white/70">
                  <span>Make</span>
                  <span>+{reveal.breakdown.makePoints}</span>
                </div>
              )}
              {reveal.breakdown.modelPoints > 0 && (
                <div className="flex justify-between text-white/70">
                  <span>Model</span>
                  <span>+{reveal.breakdown.modelPoints}</span>
                </div>
              )}
              {reveal.breakdown.yearBonus != null && reveal.breakdown.yearBonus > 0 && (
                <div className="flex justify-between text-white/70">
                  <span>Year</span>
                  <span>+{reveal.breakdown.yearBonus}</span>
                </div>
              )}
              {reveal.breakdown.timeBonus > 0 && (
                <div className="flex justify-between text-white/70">
                  <span>Speed bonus</span>
                  <span>+{reveal.breakdown.timeBonus}</span>
                </div>
              )}
              {reveal.breakdown.modeMultiplier > 1 && (
                <div className="flex justify-between text-yellow-400/80 pt-1 border-t border-white/10">
                  <span>Difficulty ×{reveal.breakdown.modeMultiplier.toFixed(1)}</span>
                  <span></span>
                </div>
              )}
              {reveal.breakdown.proBonus > 0 && (
                <div className="flex justify-between text-yellow-400/80">
                  <span>Rare find</span>
                  <span>+{reveal.breakdown.proBonus}</span>
                </div>
              )}
              <div className="flex justify-between text-primary font-black text-base pt-2 border-t border-white/20">
                <span>Total</span>
                <span>+{reveal.pointsEarned.toLocaleString()}</span>
              </div>
            </div>
          </motion.div>
        ) : reveal.pointsEarned > 0 ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center gap-2 bg-primary/20 border border-primary/40 text-primary rounded-full px-5 py-2 font-black text-xl tracking-wider mb-6"
          >
            <Zap className="w-5 h-5" />
            +{reveal.pointsEarned.toLocaleString()} pts
          </motion.div>
        ) : (
          <div className="mb-6" />
        )}

        <div className="text-xs text-muted-foreground mb-8 font-mono">
          TOTAL: {totalScore.toLocaleString()}
        </div>

        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 bg-white text-black font-black tracking-widest uppercase px-8 py-3 rounded-full hover:bg-primary hover:text-white transition-all duration-200 shadow-lg hover:shadow-primary/40"
        >
          {isLast ? (
            <><Trophy className="w-5 h-5" /> See Results</>
          ) : (
            <>Next Round <ChevronRight className="w-5 h-5" /></>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}


// ─── Main Game component ───────────────────────────────────────────────────

export default function GameScreen({ mode, username, filter, cfToken }: Props) {
  const router = useRouter();

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mediumYearGuessing, setMediumYearGuessing] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [roundState, setRoundState] = useState<"answering" | "revealed">("answering");
  const [selectedEasyId, setSelectedEasyId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [score, setScore] = useState(0);
  const [reveal, setReveal] = useState<RevealInfo | null>(null);
  const [completedRounds, setCompletedRounds] = useState<CompletedRound[]>([]);
  const [practiceComplete, setPracticeComplete] = useState(false);

  const autoSubmitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundStartRef = useRef<number>(Date.now());
  const currentRoundIdRef = useRef<string>("");
  const currentRoundImageUrlRef = useRef<string>("");

  // Hardcore grid
  const [visiblePanels, setVisiblePanels] = useState<boolean[]>(Array(9).fill(true));
  const panelOrderRef = useRef<number[]>([]);
  const panelIndexRef = useRef(0);
  const panelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ mode });
    if (username) params.set("username", username);
    if (filter) params.set("filter", filter);
    if (cfToken) params.set("cf_token", cfToken);

    Promise.all([
      fetch(`/api/game?${params.toString()}`, { signal: controller.signal }).then((r) => r.json()),
      fetch("/api/flags", { signal: controller.signal }).then((r) => r.json()),
    ])
      .then(([game, flags]) => {
        if (game.error) {
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
      .catch((err) => {
        if (err.name !== "AbortError") setError("Failed to load game. Please try again.");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [mode, username, filter]);

  useEffect(() => {
    roundStartRef.current = Date.now();
    if (gameData) {
      currentRoundIdRef.current = gameData.rounds[currentIndex].roundId;
      currentRoundImageUrlRef.current = gameData.rounds[currentIndex].imageUrl;
      const limit = gameData.timeLimitMs ?? TIME_LIMITS[mode];
      if (limit) {
        autoSubmitRef.current = setTimeout(() => handleTimeoutRef.current(), limit);
      }
    }

    if (mode === "hardcore") {
      const order = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      const initialPanels = Array(9).fill(true);
      initialPanels[order[0]] = false;
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
      if (panelIntervalRef.current !== null) clearInterval(panelIntervalRef.current);
    };
  }, [currentIndex, mode, gameData]);

  const handleTimeout = useCallback(async () => {
    if (roundState !== "answering") return;
    const roundId = currentRoundIdRef.current;
    let vehicle: VehicleInfo | undefined;
    if (roundId) {
      try {
        const res = await fetch("/api/guess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roundId, rawInput: "", timeTakenMs: Date.now() - roundStartRef.current }),
        });
        if (!res.ok && res.status === 401) { router.push("/"); return; }
        const data = await res.json();
        vehicle = data.vehicle;
      } catch {/* ignore — reveal will show blank label */}
    }
    resolveAndReveal({ imageUrl: currentRoundImageUrlRef.current, makeCorrect: false, modelCorrect: false, guessLabel: "", pointsEarned: 0, vehicle });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundState]);

  // Keep a ref to the latest handleTimeout so the round-reset effect can schedule
  // it without taking a dependency on roundState (which would restart the timer
  // on every state change mid-round).
  const handleTimeoutRef = useRef(handleTimeout);
  useEffect(() => { handleTimeoutRef.current = handleTimeout; }, [handleTimeout]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-muted-foreground font-mono tracking-widest text-sm uppercase">Loading</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
        <p className="text-center text-red-400">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 glass-panel rounded-xl px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Garage
        </button>
      </main>
    );
  }

  if (!gameData) return null;

  const round = gameData.rounds[currentIndex];
  const choices = gameData.easyChoices?.[round.roundId] ?? [];
  const isLastRound = currentIndex === gameData.rounds.length - 1;
  const isHardcore = mode === "hardcore";
  const maxTotalScore = gameData.rounds.length * Math.floor(1000 * (MAX_MULTIPLIERS[mode] ?? 1.0));

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
    const correctLabel = HARD_MODES.includes(mode) ? `${year} ${make} ${model}`.trim() : `${make} ${model}`.trim();

    setIsSubmitting(false);
    setScore((s) => s + pointsEarned);
    setReveal({ correctLabel, guessLabel, isCorrect: makeCorrect && modelCorrect, pointsEarned, breakdown });
    setCompletedRounds((prev) => [...prev, { imageUrl, correctLabel, isCorrect: makeCorrect && modelCorrect }]);
    setRoundState("revealed");
  }

  async function handleEasyAnswer(vehicleId: string) {
    if (roundState === "revealed") return;
    setSelectedEasyId(vehicleId);
    setIsSubmitting(true);
    const elapsedMs = Date.now() - roundStartRef.current;
    const guessLabel = choices.find((c) => c.vehicleId === vehicleId)?.label ?? "";
    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId: round.roundId, rawInput: guessLabel, guessedVehicleId: vehicleId, timeTakenMs: elapsedMs }),
      });
      const data = await res.json();
      if (!res.ok && res.status === 401) { router.push("/"); return; }
      if (!res.ok) {
        resolveAndReveal({ imageUrl: round.imageUrl, makeCorrect: false, modelCorrect: false, guessLabel, pointsEarned: 0 });
        return;
      }
      resolveAndReveal({ imageUrl: round.imageUrl, makeCorrect: data.makeMatch, modelCorrect: data.modelMatch, guessLabel, pointsEarned: data.pointsEarned, vehicle: data.vehicle, breakdown: { makePoints: data.makePoints, modelPoints: data.modelPoints, yearBonus: data.yearBonus, timeBonus: data.timeBonus, modeMultiplier: data.modeMultiplier, proBonus: data.proBonus } });
    } catch {
      resolveAndReveal({ imageUrl: round.imageUrl, makeCorrect: false, modelCorrect: false, guessLabel, pointsEarned: 0 });
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
      if (!res.ok && res.status === 401) { router.push("/"); return; }
      if (!res.ok) {
        resolveAndReveal({ imageUrl: round.imageUrl, makeCorrect: false, modelCorrect: false, guessLabel, pointsEarned: 0 });
        return;
      }
      resolveAndReveal({ imageUrl: round.imageUrl, makeCorrect: data.makeMatch, modelCorrect: data.modelMatch, guessLabel, pointsEarned: data.pointsEarned, vehicle: data.vehicle, breakdown: { makePoints: data.makePoints, modelPoints: data.modelPoints, yearBonus: data.yearBonus, timeBonus: data.timeBonus, modeMultiplier: data.modeMultiplier, proBonus: data.proBonus } });
    } catch {
      resolveAndReveal({ imageUrl: round.imageUrl, makeCorrect: false, modelCorrect: false, guessLabel, pointsEarned: 0 });
    }
  }

  async function handleHardSubmit(make: string, model: string, year: string) {
    if (roundState === "revealed") return;
    const elapsedMs = Date.now() - roundStartRef.current;
    const guessLabel = `${year} ${make} ${model}`.trim();
    if (!make && !model) {
      resolveAndReveal({ imageUrl: round.imageUrl, makeCorrect: false, modelCorrect: false, guessLabel: "", pointsEarned: 0 });
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
          panelsRevealed: mode === "hardcore" ? panelIndexRef.current : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok && res.status === 401) { router.push("/"); return; }
      if (!res.ok) {
        resolveAndReveal({ imageUrl: round.imageUrl, makeCorrect: false, modelCorrect: false, guessLabel, pointsEarned: 0 });
        return;
      }
      resolveAndReveal({ imageUrl: round.imageUrl, makeCorrect: data.makeMatch, modelCorrect: data.modelMatch, guessLabel, pointsEarned: data.pointsEarned, vehicle: data.vehicle, breakdown: { makePoints: data.makePoints, modelPoints: data.modelPoints, yearBonus: data.yearBonus, timeBonus: data.timeBonus, modeMultiplier: data.modeMultiplier, proBonus: data.proBonus } });
    } catch {
      resolveAndReveal({ imageUrl: round.imageUrl, makeCorrect: false, modelCorrect: false, guessLabel, pointsEarned: 0 });
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
      const endRes = await fetch("/api/session/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: gameData!.gameId, finalScore: score }),
      });
      if (!endRes.ok && endRes.status === 401) { router.push("/"); return; }
      const params = new URLSearchParams({
        gameId: gameData!.gameId,
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
    setIsSubmitting(false);
  }

  // Practice complete screen
  if (practiceComplete) {
    const correct = completedRounds.filter((r) => r.isCorrect).length;
    const total = completedRounds.length;
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-3xl p-10 max-w-lg w-full text-center border border-white/10"
        >
          <div className="mb-8">
            <Flag className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-black tracking-widest uppercase mb-1">Session Over</h1>
            <p className="text-muted-foreground">{username || "Driver"} · Garage mode</p>
          </div>

          <div className="text-5xl font-black text-white mb-1">
            {correct} <span className="text-2xl text-muted-foreground">/ {total}</span>
          </div>
          <div className="text-sm text-muted-foreground font-mono tracking-widest mb-8">CORRECT</div>

          <div className="space-y-2 mb-8 text-left">
            {completedRounds.map((r, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.imageUrl} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                <p className={cn("flex-1 min-w-0 truncate text-sm font-medium", r.isCorrect ? "text-zinc-200" : "text-zinc-500")}>
                  {r.correctLabel}
                </p>
                <span className={cn("text-lg shrink-0", r.isCorrect ? "text-green-400" : "text-red-400")}>
                  {r.isCorrect ? "✓" : "✗"}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push(`/game?mode=practice&username=${username}&filter=${filter}`)}
              className="inline-flex items-center gap-2 bg-primary text-white font-black tracking-widest uppercase px-6 py-3 rounded-full hover:brightness-110 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Play Again
            </button>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 border border-white/20 text-white font-bold tracking-widest uppercase px-6 py-3 rounded-full hover:bg-white/10 transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Garage
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      {/* Sticky top HUD */}
      <div className="sticky top-0 z-40 glass-panel border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors text-sm font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Garage
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1">
              {gameData.rounds.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    i < currentIndex ? "bg-green-500" : i === currentIndex ? "bg-primary scale-125" : "bg-white/15"
                  )}
                />
              ))}
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {currentIndex + 1}/{gameData.rounds.length}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-bold tracking-widest text-primary uppercase">
              {MODE_LABELS[mode] || mode}
            </span>
            {username && (
              <span className="hidden sm:block text-xs font-mono text-muted-foreground">
                {username}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

        {/* Left column */}
        <div className="space-y-4">

          {/* Car image */}
          <AnimatePresence>
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="relative rounded-2xl overflow-hidden aspect-video bg-card border border-white/10 shadow-xl"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={round.imageUrl}
                src={round.imageUrl}
                alt="Identify this car"
                loading="eager"
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />

              {/* Image fallback bg */}
              <div className="absolute inset-0 -z-10 flex items-center justify-center bg-card">
                <span className="text-sm text-muted-foreground">Image unavailable</span>
              </div>

              {/* Hardcore grid overlay — panels are removed every 5 seconds */}
              {isHardcore && roundState === "answering" && (
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                  {visiblePanels.map((visible, i) => (
                    <div
                      key={i}
                      className="bg-black transition-opacity duration-500"
                      style={{ opacity: visible ? 1 : 0 }}
                    />
                  ))}
                </div>
              )}

              {/* Round label */}
              <div className="absolute top-4 left-4 glass-panel px-3 py-1 rounded-full text-xs font-bold tracking-widest text-white/70 uppercase">
                {isHardcore ? "Hardcore" : `Round ${currentIndex + 1}`}
              </div>

            </motion.div>
          </AnimatePresence>

          {/* Answer area */}
          <AnimatePresence mode="wait">
            {roundState === "answering" && (
              <motion.div
                key={`answer-${currentIndex}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="glass-panel rounded-2xl p-5 border border-white/10"
              >
                <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-4">
                  {mode === "easy" && "Choose the correct make & model"}
                  {mode === "custom" && "Choose the correct make & model"}
                  {(mode === "standard" || mode === "hardcore") && "Type make, model & year exactly"}
                  {mode === "time_attack" && "Identify before the image reveals!"}
                  {mode === "practice" && "Choose the correct make & model"}
                </p>

                {CHOICE_MODES.includes(mode) && (
                  <div className="grid grid-cols-2 gap-3">
                    {choices.map((choice, i) => {
                      const isSelected = selectedEasyId === choice.vehicleId;
                      return (
                        <motion.button
                          key={choice.vehicleId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ delay: i * 0.06 }}
                          onClick={() => handleEasyAnswer(choice.vehicleId)}
                          disabled={selectedEasyId !== null}
                          className={cn(
                            "relative group p-4 rounded-xl border-2 text-left transition-all duration-200 font-bold text-sm tracking-wide overflow-hidden disabled:pointer-events-none",
                            isSelected && isSubmitting
                              ? "border-primary/60 bg-primary/10"
                              : "border-white/10 bg-white/5 hover:border-primary/60 hover:bg-primary/10"
                          )}
                        >
                          <span className="absolute top-2 right-3 text-xs font-mono text-white/20 group-hover:text-primary/50 transition-colors">
                            {isSelected && isSubmitting
                              ? <span className="inline-block w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                              : String.fromCharCode(65 + i)
                            }
                          </span>
                          {choice.label}
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {mode === "custom" && (
                  <CustomModeInput
                    makes={gameData.makes ?? []}
                    showYear={mediumYearGuessing}
                    disabled={false}
                    onSubmit={handleMediumSubmit}
                  />
                )}

                {HARD_MODES.includes(mode) && (
                  <StandardModeInput
                    makes={gameData.makes ?? []}
                    disabled={false}
                    onSubmit={handleHardSubmit}
                  />
                )}

                <button
                  onClick={handleTimeout}
                  className="mt-3 w-full py-2 rounded-xl border border-white/10 text-white/40 text-xs font-bold tracking-widest uppercase hover:border-white/20 hover:text-white/60 transition-all"
                >
                  Give Up
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right column */}
        <div className="flex flex-col items-center gap-5 lg:sticky lg:top-20">

          {/* Tachometer */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 w-full flex flex-col items-center">
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-4">
              Score Gauge
            </p>
            <Tachometer score={score} maxScore={maxTotalScore} size={240} />
            <div className="mt-4 w-full space-y-2">
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>ROUND</span>
                <span className="text-white font-bold">{currentIndex + 1} / {gameData.rounds.length}</span>
              </div>
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>TOTAL SCORE</span>
                <span className="text-white font-bold">{score.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>MAX POSSIBLE</span>
                <span className="text-white/40">{maxTotalScore.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Mode info chip */}
          <div className="glass-panel rounded-2xl p-4 border border-white/10 w-full">
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-sm font-black tracking-widest uppercase">{MODE_LABELS[mode] || mode}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {mode === "easy" && "Pick the right car from 4 choices."}
              {mode === "custom" && "Pick the right car from 4 choices. Filtered to your chosen collection."}
              {mode === "standard" && "Type make, model, and year."}
              {mode === "hardcore" && "Same as Standard. Panels are removed every 5 seconds to reveal the car."}
              {mode === "time_attack" && "Race the clock — faster answers earn bonus points."}
              {mode === "practice" && "No leaderboard pressure. Drill your knowledge."}
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {roundState === "revealed" && reveal && (
          <RoundResult
            reveal={reveal}
            round={currentIndex + 1}
            totalRounds={gameData.rounds.length}
            totalScore={score}
            onNext={handleNext}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
