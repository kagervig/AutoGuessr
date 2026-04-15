"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { MODES, GameMode } from "@/app/lib/constants";
import {
  ScoringIntro,
  shouldShowIntro,
} from "@/app/components/ui/ScoringIntro";
import { RoundResult } from "../RoundResult";
import { GameHeader } from "./GameHeader";
import { RoundImage } from "./RoundImage";
import { AnswerSection } from "./AnswerSection";
import { ScoreSidebar } from "./ScoreSidebar";
import { PracticeCompleteScreen } from "./PracticeCompleteScreen";
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

// ─── Main Game component ───────────────────────────────────────────────────

export default function GameScreen({ mode, username, filter, cfToken }: Props) {
  const router = useRouter();

  const { gameData, loading, error, mediumYearGuessing, retrying } = useGameLoader({ mode, username, filter, cfToken });
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
        {retrying && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 glass-panel rounded-xl px-5 py-3 text-sm text-white">
            Error loading game, please wait.
          </div>
        )}
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

  const isHardcore = mode === GameMode.Hardcore;
  const modeLabel = MODE_LABELS[mode] || mode;

  // Practice complete screen
  if (practiceComplete) {
    return (
      <PracticeCompleteScreen
        username={username}
        completedRounds={completedRounds}
        onPlayAgain={() => router.push(`/game?mode=practice&username=${username}&filter=${filter}`)}
        onBack={() => router.push("/")}
      />
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
        modeLabel={modeLabel}
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
          <RoundImage
            imageUrl={round.imageUrl}
            currentIndex={currentIndex}
            isHardcore={isHardcore}
            roundState={roundState}
            visiblePanels={visiblePanels}
          />

          {/* Answer area */}
          <AnswerSection
            mode={mode}
            currentIndex={currentIndex}
            roundState={roundState}
            choices={choices}
            selectedEasyId={selectedEasyId}
            isSubmitting={isSubmitting}
            makes={gameData.makes ?? []}
            mediumYearGuessing={mediumYearGuessing}
            onEasyAnswer={handleEasyAnswer}
            onMediumSubmit={handleMediumSubmit}
            onHardSubmit={handleHardSubmit}
            onGiveUp={handleTimeout}
          />
        </div>

        {/* Right column */}
        <ScoreSidebar
          mode={mode}
          modeLabel={modeLabel}
          score={score}
          maxTotalScore={maxTotalScore}
          currentIndex={currentIndex}
          totalRounds={gameData.rounds.length}
        />
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
