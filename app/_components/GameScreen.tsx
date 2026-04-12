"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Star,
  Flag,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { MODES } from "@/app/lib/constants";
import { Tachometer } from "@/app/components/ui/Tachometer";
import {
  ScoringIntro,
  shouldShowIntro,
} from "@/app/components/ui/ScoringIntro";
import { cn } from "@/app/lib/utils";
import CustomModeInput from "./CustomModeInput";
import StandardModeInput from "./StandardModeInput";
import { RoundResult } from "./RoundResult";
import { GameHeader } from "./GameHeader";
import { useGameLoader } from "@/app/_hooks/useGameLoader";
import { useRoundTimer } from "@/app/_hooks/useRoundTimer";
import { useGameSession } from "@/app/_hooks/useGameSession";

const MODE_LABELS: Record<string, string> = Object.fromEntries(
  MODES.map((m) => [m.id, m.label]),
);

interface Props {
  mode: string;
  username: string;
  filter: string;
  cfToken?: string;
}

const HARD_MODES = ["standard", "hardcore", "time_attack"];
const CHOICE_MODES = ["easy", "practice", "custom"];

// ─── Main Game component ───────────────────────────────────────────────────

export default function GameScreen({ mode, username, filter, cfToken }: Props) {
  const router = useRouter();

  const { gameData, loading, error, mediumYearGuessing } = useGameLoader({ mode, username, filter, cfToken });
  const [introVisible, setIntroVisible] = useState(() => shouldShowIntro(mode));

  // currentIndex is declared here so it can be passed to both useRoundTimer and useGameSession.
  const [currentIndex, setCurrentIndex] = useState(0);

  // handleTimeoutRef is declared before useRoundTimer so it can be passed as onTimeout.
  // useGameSession syncs it to the latest handleTimeout internally.
  const handleTimeoutRef = useRef<() => void>(() => {});

  const {
    visiblePanels,
    hasSubmittedRef,
    roundStartRef,
    currentRoundIdRef,
    currentRoundImageUrlRef,
    autoSubmitRef,
    panelIndexRef,
    panelIntervalRef,
  } = useRoundTimer({ mode, gameData, currentIndex, introVisible, onTimeout: handleTimeoutRef });

  const {
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
    handleTimeout,
    handleEasyAnswer,
    handleMediumSubmit,
    handleHardSubmit,
    handleNext,
    handleRateImage,
    handleReportImage,
  } = useGameSession({
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
  });

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-muted-foreground font-mono tracking-widest text-sm uppercase">
            Loading
          </p>
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

  if (networkError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
        <p className="text-center text-muted-foreground">
          Sorry, network failure. Your answer could not be submitted.
        </p>
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 glass-panel rounded-xl px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors"
        >
          New Game
        </button>
      </main>
    );
  }

  if (!gameData || !round) return null;

  const isHardcore = mode === "hardcore";

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
            <h1 className="text-4xl font-black tracking-widest uppercase mb-1">
              Session Over
            </h1>
            <p className="text-muted-foreground">
              {username || "Driver"} · Garage mode
            </p>
          </div>

          <div className="text-5xl font-black text-white mb-1">
            {correct}{" "}
            <span className="text-2xl text-muted-foreground">/ {total}</span>
          </div>
          <div className="text-sm text-muted-foreground font-mono tracking-widest mb-8">
            CORRECT
          </div>

          <div className="space-y-2 mb-8 text-left">
            {completedRounds.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.imageUrl}
                  alt=""
                  className="h-12 w-16 shrink-0 rounded-lg object-cover"
                />
                <p
                  className={cn(
                    "flex-1 min-w-0 truncate text-sm font-medium",
                    r.isCorrect ? "text-zinc-200" : "text-zinc-500",
                  )}
                >
                  {r.correctLabel}
                </p>
                <span
                  className={cn(
                    "text-lg shrink-0",
                    r.isCorrect ? "text-green-400" : "text-red-400",
                  )}
                >
                  {r.isCorrect ? "✓" : "✗"}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() =>
                router.push(
                  `/game?mode=practice&username=${username}&filter=${filter}`,
                )
              }
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
      <AnimatePresence>
        {introVisible && (
          <ScoringIntro mode={mode} onDismiss={() => setIntroVisible(false)} />
        )}
      </AnimatePresence>

      <GameHeader
        modeLabel={MODE_LABELS[mode] || mode}
        username={username}
        currentIndex={currentIndex}
        totalRounds={gameData.rounds.length}
        onBack={() => router.push("/")}
      />

      {/* Main layout */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* Left column */}
        <div className="space-y-4">
          {/* Car image */}
          <AnimatePresence mode="wait">
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
                <span className="text-sm text-muted-foreground">
                  Image unavailable
                </span>
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

          {/* Image feedback */}
          <div className="hidden sm:flex items-center justify-between px-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-[7px] sm:text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                Rate Image
              </span>
              <div className="flex gap-2 sm:gap-2">
                <button
                  onClick={() => handleRateImage("up")}
                  aria-label="Thumbs up"
                  className={cn(
                    "w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center border transition-colors",
                    imageRating === "up"
                      ? "bg-green-500/20 border-green-500/40 text-green-400"
                      : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80",
                  )}
                >
                  <ThumbsUp className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={() => handleRateImage("down")}
                  aria-label="Thumbs down"
                  className={cn(
                    "w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center border transition-colors",
                    imageRating === "down"
                      ? "bg-red-500/20 border-red-500/40 text-red-400"
                      : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80",
                  )}
                >
                  <ThumbsDown className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-[7px] sm:text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                Report
              </span>
              <button
                onClick={handleReportImage}
                aria-label="Report image"
                disabled={imageReported}
                className={cn(
                  "w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center border transition-colors disabled:pointer-events-none",
                  imageReported
                    ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
                    : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80",
                )}
              >
                <Flag className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

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
                  {(mode === "standard" || mode === "hardcore") &&
                    "Type make, model & year exactly"}
                  {mode === "time_attack" &&
                    "Identify before the image reveals!"}
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
                              : "border-white/10 bg-white/5 hover:border-primary/60 hover:bg-primary/10",
                          )}
                        >
                          <span className="absolute top-2 right-3 text-xs font-mono text-white/20 group-hover:text-primary/50 transition-colors">
                            {isSelected && isSubmitting ? (
                              <span className="inline-block w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            ) : (
                              String.fromCharCode(65 + i)
                            )}
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
            <Tachometer score={score} maxScore={maxTotalScore} size={300} />
            <div className="mt-4 w-full space-y-2">
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>ROUND</span>
                <span className="text-white font-bold">
                  {currentIndex + 1} / {gameData.rounds.length}
                </span>
              </div>
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>TOTAL SCORE</span>
                <span className="text-white font-bold">
                  {score.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>MAX POSSIBLE</span>
                <span className="text-white/40">
                  {maxTotalScore.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Mode info chip */}
          <div className="glass-panel rounded-2xl p-4 border border-white/10 w-full">
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-sm font-black tracking-widest uppercase">
                {MODE_LABELS[mode] || mode}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {mode === "easy" && "Pick the right car from 4 choices."}
              {mode === "custom" &&
                "Pick the right car from 4 choices. Filtered to your chosen collection."}
              {mode === "standard" && "Type make, model, and year."}
              {mode === "hardcore" &&
                "Same as Standard. Panels are removed every 5 seconds to reveal the car."}
              {mode === "time_attack" &&
                "Race the clock — faster answers earn bonus points."}
              {mode === "practice" &&
                "No leaderboard pressure. Drill your knowledge."}
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
            imageRating={imageRating}
            imageReported={imageReported}
            onRate={handleRateImage}
            onReport={handleReportImage}
            onNext={handleNext}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
