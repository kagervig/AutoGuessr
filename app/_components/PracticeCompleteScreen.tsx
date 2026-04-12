"use client";
// End-of-session summary screen for practice mode: score, per-round results, and navigation buttons.
import { motion } from "framer-motion";
import { Flag, RotateCcw, ArrowLeft } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface CompletedRound {
  imageUrl: string;
  correctLabel: string;
  isCorrect: boolean;
}

interface Props {
  username: string;
  completedRounds: CompletedRound[];
  onPlayAgain: () => void;
  onBack: () => void;
}

export function PracticeCompleteScreen({ username, completedRounds, onPlayAgain, onBack }: Props) {
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
            onClick={onPlayAgain}
            className="inline-flex items-center gap-2 bg-primary text-white font-black tracking-widest uppercase px-6 py-3 rounded-full hover:brightness-110 transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Play Again
          </button>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 border border-white/20 text-white font-bold tracking-widest uppercase px-6 py-3 rounded-full hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Garage
          </button>
        </div>
      </motion.div>
    </div>
  );
}
