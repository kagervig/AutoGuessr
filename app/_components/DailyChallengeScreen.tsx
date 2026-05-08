"use client";
// Daily challenge game screen — uses session-based loading and grading.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Trophy, Flame, Star, ArrowLeft } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { GameHeader } from "./GameScreen/GameHeader";
import { RoundImage } from "./GameScreen/RoundImage";
import { RoundReveal } from "./GameScreen/RoundReveal";
import { ScoreSidebar } from "./GameScreen/ScoreSidebar";
import { useDailyChallengeLoader } from "@/app/_hooks/useDailyChallengeLoader";
import { useDailyChallengeSession } from "@/app/_hooks/useDailyChallengeSession";
import { usePlayerId } from "@/app/_hooks/usePlayerId";

function DailyChallengeLoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
        <p className="text-muted-foreground font-mono tracking-widest text-sm uppercase">Loading</p>
      </div>
    </main>
  );
}

function DailyChallengeErrorState({ error, onBack }: { error: string | null; onBack: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <p className="text-center text-red-400">{error ?? "Failed to load daily challenge."}</p>
      <button
        onClick={onBack}
        className="flex items-center gap-2 glass-panel rounded-xl px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Garage
      </button>
    </main>
  );
}

function DailyChallengeNetworkErrorState({ onHome }: { onHome: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <p className="text-center text-muted-foreground">
        Sorry, network failure. Your answer could not be submitted.
      </p>
      <button
        onClick={onHome}
        className="flex items-center gap-2 glass-panel rounded-xl px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors"
      >
        New Game
      </button>
    </main>
  );
}

// Post-game screen shown when all rounds are finished, displaying total score, leaderboard rank, player count, and top percentile.
function CompletionScreen({
  totalScore,
  rank,
  totalPlayers,
  percentile,
  onHome,
}: {
  totalScore: number;
  rank: number;
  totalPlayers: number;
  percentile: number;
  onHome: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="text-center max-w-sm w-full glass-panel rounded-3xl p-8 border border-white/10"
      >
        <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
        <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2">Daily Challenge Complete</p>
        <p className="text-5xl font-black text-white mb-6">{totalScore.toLocaleString()}</p>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white/5 rounded-2xl p-3">
            <p className="text-2xl font-black text-primary">#{rank}</p>
            <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase mt-1">Rank</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3">
            <p className="text-2xl font-black text-white">{totalPlayers}</p>
            <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase mt-1">Players</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3">
            <p className="text-2xl font-black text-green-400">
              {percentile}
              <span className="text-sm">%</span>
            </p>
            <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase mt-1">Top</p>
          </div>
        </div>

        <button
          onClick={onHome}
          className="w-full inline-flex items-center justify-center gap-2 bg-white text-black font-black tracking-widest uppercase px-8 py-3 rounded-full hover:bg-primary hover:text-white transition-all duration-200"
        >
          Back to Garage
        </button>
      </motion.div>
    </main>
  );
}

interface Props {
  username?: string;
  date?: string;
}

export default function DailyChallengeScreen({ username = "", date }: Props) {
  const router = useRouter();
  const playerId = usePlayerId();
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data, loading, error } = useDailyChallengeLoader({ date, playerId });
  const { roundState, selectedChoiceId, isSubmitting, score, reveal, networkError, round, handleAnswer, handleNext } =
    useDailyChallengeSession({ data, currentIndex, setCurrentIndex });

  if (loading) return <DailyChallengeLoadingState />;
  if (error || !data) return <DailyChallengeErrorState error={error} onBack={() => router.push("/")} />;
  if (networkError) return <DailyChallengeNetworkErrorState onHome={() => router.push("/")} />;

  if (roundState === "complete" && reveal) {
    return (
      <CompletionScreen
        totalScore={reveal.totalScore ?? score}
        rank={reveal.rank ?? 1}
        totalPlayers={reveal.totalPlayers ?? 1}
        percentile={reveal.percentile ?? 100}
        onHome={() => router.push("/")}
      />
    );
  }

  // Game level loaded successfully.
  if (!round) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <GameHeader
        modeLabel="Daily Challenge"
        username={username}
        currentIndex={currentIndex}
        totalRounds={data.rounds.length}
        onBack={() => router.push("/")}
      />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        <div className="space-y-4">
          <RoundImage
            imageUrl={round.imageUrl}
            currentIndex={currentIndex}
            isHardcore={false}
            roundState={roundState === "revealed" ? "revealed" : "answering"}
            visiblePanels={[]}
          />

          <AnimatePresence mode="wait">
            {roundState === "answering" && (
              <motion.div
                key={`choices-${currentIndex}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="glass-panel rounded-2xl p-5 border border-white/10"
              >
                <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-4">
                  Choose the correct make &amp; model
                </p>

                {round.bonusFlags.isHardcore || round.bonusFlags.isCotd || round.bonusFlags.isRareFind ? (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {round.bonusFlags.isHardcore && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-red-400 border border-red-400/30 bg-red-400/10 rounded-full px-3 py-1">
                        <Flame className="w-3 h-3" /> Hardcore
                      </span>
                    )}
                    {round.bonusFlags.isCotd && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-orange-400 border border-orange-400/30 bg-orange-400/10 rounded-full px-3 py-1">
                        <Trophy className="w-3 h-3" /> Car of the Day
                      </span>
                    )}
                    {round.bonusFlags.isRareFind && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-yellow-400 border border-yellow-400/30 bg-yellow-400/10 rounded-full px-3 py-1">
                        <Star className="w-3 h-3" /> Rare Find
                      </span>
                    )}
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  {round.distractors.map((choice, i) => {
                    const isSelected = selectedChoiceId === choice.vehicleId;
                    return (
                      <motion.button
                        key={choice.vehicleId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ delay: i * 0.06 }}
                        onClick={() => handleAnswer(choice.vehicleId)}
                        disabled={selectedChoiceId !== null}
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

                <button
                  onClick={() => handleAnswer("")}
                  disabled={selectedChoiceId !== null}
                  className="mt-3 w-full py-2 rounded-xl border border-white/10 text-white/40 text-xs font-bold tracking-widest uppercase hover:border-white/20 hover:text-white/60 transition-all disabled:pointer-events-none"
                >
                  Give Up
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ScoreSidebar
          mode="daily"
          modeLabel="Daily Challenge"
          score={score}
          maxTotalScore={data.rounds.length * Math.floor(1000 * 1.7)}
          currentIndex={currentIndex}
          totalRounds={data.rounds.length}
        />
      </div>

      <AnimatePresence>
        {roundState === "revealed" && reveal && (
          <RoundReveal
            reveal={reveal}
            round={currentIndex + 1}
            totalRounds={data.rounds.length}
            totalScore={score}
            onNext={handleNext}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
