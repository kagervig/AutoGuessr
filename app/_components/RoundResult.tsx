"use client";

import { motion } from "framer-motion";
import {
  ChevronRight,
  Check,
  X,
  Zap,
  Star,
  Flag,
  Trophy,
  CheckCircle2,
  Target,
  Calendar,
  Clock,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

export interface PointsBreakdown {
  makePoints: number;
  modelPoints: number;
  yearBonus: number | null;
  yearDelta?: number | null;
  timeBonus: number;
  modeMultiplier: number;
  proBonus: number;
}

export interface RevealInfo {
  correctLabel: string;
  guessLabel: string;
  isCorrect: boolean;
  pointsEarned: number;
  breakdown?: PointsBreakdown;
}

export function RoundResult({
  reveal,
  round,
  totalRounds,
  totalScore,
  imageRating,
  imageReported,
  onRate,
  onReport,
  onNext,
}: {
  reveal: RevealInfo;
  round: number;
  totalRounds: number;
  totalScore: number;
  imageRating: "up" | "down" | null;
  imageReported: boolean;
  onRate: (value: "up" | "down") => void;
  onReport: () => void;
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
        <div
          className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl",
            reveal.isCorrect
              ? "bg-green-500/20 shadow-green-500/30"
              : "bg-red-600/20 shadow-red-600/30",
          )}
        >
          {reveal.isCorrect ? (
            <Check className="w-10 h-10 text-green-400" strokeWidth={3} />
          ) : (
            <X className="w-10 h-10 text-red-400" strokeWidth={3} />
          )}
        </div>

        <p
          className={cn(
            "text-2xl font-black tracking-widest uppercase mb-1",
            reveal.isCorrect ? "text-green-400" : "text-red-400",
          )}
        >
          {reveal.isCorrect ? "Nailed it!" : "Miss!"}
        </p>

        <p className="text-sm text-muted-foreground mb-1">
          {reveal.correctLabel}
        </p>
        {!reveal.isCorrect && reveal.guessLabel && (
          <p className="text-xs text-red-400/70 mb-4">
            You said: {reveal.guessLabel}
          </p>
        )}
        {reveal.isCorrect && <div className="mb-4" />}

        {reveal.pointsEarned > 0 && reveal.breakdown ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full mb-6 text-left bg-card border border-white/10 rounded-2xl p-4"
          >
            <p className="text-xs font-mono tracking-widest uppercase text-white/30 mb-2">
              Round score
            </p>
            <div className="space-y-2">
              {reveal.breakdown.makePoints > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-white/50" />
                    <span className="text-sm text-white/80">Correct make</span>
                  </div>
                  <span className="text-sm font-black text-white">
                    +{reveal.breakdown.makePoints}
                  </span>
                </div>
              )}
              {reveal.breakdown.modelPoints > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 shrink-0 text-white/50" />
                    <span className="text-sm text-white/80">Correct model</span>
                  </div>
                  <span className="text-sm font-black text-white">
                    +{reveal.breakdown.modelPoints}
                  </span>
                </div>
              )}
              {reveal.breakdown.yearBonus != null &&
                reveal.breakdown.yearBonus > 0 && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 shrink-0 text-white/50" />
                      <span className="text-sm text-white/80">
                        Year bonus
                        {reveal.breakdown.yearDelta != null &&
                          reveal.breakdown.yearDelta > 0 && (
                            <span className="text-white/40 ml-1">
                              ({reveal.breakdown.yearDelta} off)
                            </span>
                          )}
                      </span>
                    </div>
                    <span className="text-sm font-black text-white">
                      +{reveal.breakdown.yearBonus}
                    </span>
                  </div>
                )}
              {reveal.breakdown.timeBonus > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 shrink-0 text-white/50" />
                    <span className="text-sm text-white/80">Speed bonus</span>
                  </div>
                  <span className="text-sm font-black text-white">
                    +{reveal.breakdown.timeBonus}
                  </span>
                </div>
              )}
              {reveal.breakdown.modeMultiplier > 1 && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-yellow-400/20 bg-yellow-400/5 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 shrink-0 text-yellow-400/70" />
                    <span className="text-sm text-yellow-400/80">
                      Difficulty multiplier
                    </span>
                  </div>
                  <span className="text-sm font-black text-yellow-400">
                    ×{reveal.breakdown.modeMultiplier.toFixed(1)}
                  </span>
                </div>
              )}
              {reveal.breakdown.proBonus > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-yellow-400/20 bg-yellow-400/5 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 shrink-0 text-yellow-400/70" />
                    <span className="text-sm text-yellow-400/80">
                      Rare find
                    </span>
                  </div>
                  <span className="text-sm font-black text-yellow-400">
                    +{reveal.breakdown.proBonus}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
                <span className="text-sm font-black text-primary uppercase tracking-widest">
                  Total
                </span>
                <span className="text-base font-black text-primary">
                  +{reveal.pointsEarned.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="border-t border-white/10 mt-3 pt-3 flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-white/40 uppercase">
                Total Score
              </span>
              <span className="text-lg font-black text-white">
                {totalScore.toLocaleString()}
              </span>
            </div>
          </motion.div>
        ) : reveal.pointsEarned > 0 ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center gap-2 bg-primary/20 border border-primary/40 text-primary rounded-full px-5 py-2 font-black text-xl tracking-wider mb-6"
          >
            <Zap className="w-5 h-5" />+{reveal.pointsEarned.toLocaleString()}{" "}
            pts
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full mb-6 text-left bg-card border border-white/10 rounded-2xl p-4"
          >
            <p className="text-xs font-mono tracking-widest uppercase text-white/30 mb-2">
              Round score
            </p>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3">
              <span className="text-sm text-white/50">No points scored</span>
              <span className="text-sm font-black text-white/50">0</span>
            </div>
            <div className="border-t border-white/10 mt-3 pt-3 flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-white/40 uppercase">
                Total Score
              </span>
              <span className="text-lg font-black text-white">
                {totalScore.toLocaleString()}
              </span>
            </div>
          </motion.div>
        )}

        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Rate Image
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onRate("up")}
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
              onClick={() => onRate("down")}
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
              onClick={onReport}
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
          {isLast ? (
            <>
              <Trophy className="w-5 h-5" /> See Results
            </>
          ) : (
            <>
              Next Round <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}
