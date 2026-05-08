// Overlay shown after each guess: correctness, points, bonuses, image rating, and next/finish button.
"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, ChevronRight, Trophy, ThumbsUp, ThumbsDown, Flag, Flame, Star } from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { DailyChallengeReveal } from "@/app/_hooks/useDailyChallengeSession";

const BONUS_LABELS: Record<string, { label: string; icon: React.ReactNode; colour: string }> = {
  hardcore: {
    label: "Hardcore image",
    icon: <Flame className="w-5 h-5 shrink-0 text-red-400" />,
    colour: "border-red-400/30 bg-red-400/10",
  },
  cotd: {
    label: "Car of the Day",
    icon: <Trophy className="w-5 h-5 shrink-0 text-orange-400" />,
    colour: "border-orange-400/30 bg-orange-400/10",
  },
  rareFind: {
    label: "Rare find",
    icon: <Star className="w-5 h-5 shrink-0 text-yellow-400" />,
    colour: "border-yellow-400/30 bg-yellow-400/10",
  },
};

interface Props {
  reveal: DailyChallengeReveal;
  round: number;
  totalRounds: number;
  totalScore: number;
  onNext: () => void;
}

export function RoundReveal({ reveal, round, totalRounds, totalScore, onNext }: Props) {
  const [imageRating, setImageRating] = useState<"up" | "down" | null>(null);
  const [imageReported, setImageReported] = useState(false);
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
        <div
          className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl",
            reveal.correct
              ? "bg-green-500/20 shadow-green-500/30"
              : "bg-red-600/20 shadow-red-600/30",
          )}
        >
          {reveal.correct ? (
            <Check className="w-10 h-10 text-green-400" strokeWidth={3} />
          ) : (
            <X className="w-10 h-10 text-red-400" strokeWidth={3} />
          )}
        </div>

        <p className={cn("text-2xl font-black tracking-widest uppercase mb-1", reveal.correct ? "text-green-400" : "text-red-400")}>
          {reveal.correct ? "Nailed it!" : "Miss!"}
        </p>
        <p className="text-sm text-muted-foreground mb-1">{reveal.correctLabel}</p>
        {!reveal.correct && reveal.guessedLabel && (
          <p className="text-xs text-red-400/70 mb-4">You said: {reveal.guessedLabel}</p>
        )}
        {reveal.correct && <div className="mb-4" />}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full mb-6 text-left bg-card border border-white/10 rounded-2xl p-4"
        >
          <p className="text-xs font-mono tracking-widest uppercase text-white/30 mb-2">Round score</p>
          <div className="space-y-2">
            {reveal.score > 0 && reveal.bonusesEarned.length === 0 && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 shrink-0 text-white/50" />
                  <span className="text-sm text-white/80">Identified</span>
                </div>
                <span className="text-sm font-black text-white">+{reveal.score}</span>
              </div>
            )}
            {reveal.score > 0 && reveal.bonusesEarned.length > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 shrink-0 text-white/50" />
                  <span className="text-sm text-white/80">Identified</span>
                </div>
                <span className="text-sm font-black text-white">
                  +{reveal.score - reveal.bonusesEarned.reduce((s, b) => s + b.points, 0)}
                </span>
              </div>
            )}
            {reveal.score === 0 && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3">
                <span className="text-sm text-white/50">No points scored</span>
                <span className="text-sm font-black text-white/50">0</span>
              </div>
            )}
            {reveal.bonusesEarned.map((bonus) => {
              const meta = BONUS_LABELS[bonus.type];
              if (!meta) return null;
              return (
                <motion.div
                  key={bonus.type}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border px-4 py-3",
                    meta.colour,
                  )}
                >
                  <div className="flex items-center gap-3">
                    {meta.icon}
                    <span className="text-sm font-bold text-white/90">{meta.label}</span>
                  </div>
                  <span className="text-sm font-black text-white">+{bonus.points.toLocaleString()}</span>
                </motion.div>
              );
            })}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
              <span className="text-sm font-black text-primary uppercase tracking-widest">Total</span>
              <span className="text-base font-black text-primary">+{reveal.score.toLocaleString()}</span>
            </div>
          </div>
          <div className="border-t border-white/10 mt-3 pt-3 flex items-center justify-between">
            <span className="text-xs font-bold tracking-widest text-white/40 uppercase">Running Score</span>
            <span className="text-lg font-black text-white">{totalScore.toLocaleString()}</span>
          </div>
        </motion.div>

        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Rate Image</span>
          <div className="flex gap-2">
            <button
              onClick={() => setImageRating((r) => r === "up" ? null : "up")}
              aria-label="Thumbs up"
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center border transition-colors",
                imageRating === "up"
                  ? "bg-green-500/20 border-green-500/40 text-green-400"
                  : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80",
              )}
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => setImageRating((r) => r === "down" ? null : "down")}
              aria-label="Thumbs down"
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center border transition-colors",
                imageRating === "down"
                  ? "bg-red-500/20 border-red-500/40 text-red-400"
                  : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80",
              )}
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
            <button
              onClick={() => setImageReported(true)}
              aria-label="Report image"
              disabled={imageReported}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center border transition-colors disabled:pointer-events-none",
                imageReported
                  ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
                  : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80",
              )}
            >
              <Flag className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 bg-white text-black font-black tracking-widest uppercase px-8 py-3 rounded-full hover:bg-primary hover:text-white transition-all duration-200 shadow-lg hover:shadow-primary/40"
        >
          {isLast ? <><Trophy className="w-5 h-5" /> See Results</> : <>Next Round <ChevronRight className="w-5 h-5" /></>}
        </button>
      </motion.div>
    </motion.div>
  );
}
