"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  SlidersHorizontal,
  Gauge,
  Timer,
  Flame,
  Dumbbell,
  CheckCircle2,
  Target,
  Clock,
  Calendar,
  Star,
  Zap,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

interface ScoreRow {
  icon: React.ReactNode;
  label: string;
  value: string;
}

interface ModeIntroConfig {
  heading: string;
  icon: React.ReactNode;
  description: string;
  difficulty: number; // 1–5
  difficultyLabel: string;
  rows: ScoreRow[];
  tip: string;
}

const ROW_ICON_CLASS = "w-5 h-5 shrink-0 text-white/50";

const MODE_INTROS: Record<string, ModeIntroConfig> = {
  easy: {
    heading: "Easy Mode",
    icon: <ShieldCheck className="w-8 h-8 text-green-400" />,
    description: "Pick the right car from 4 multiple-choice answers.",
    difficulty: 1,
    difficultyLabel: "Beginner",
    rows: [
      { icon: <CheckCircle2 className={ROW_ICON_CLASS} />, label: "Correct make",        value: "+300 pts" },
      { icon: <Target       className={ROW_ICON_CLASS} />, label: "Correct model",       value: "+400 pts" },
      { icon: <Clock        className={ROW_ICON_CLASS} />, label: "Speed bonus",         value: "up to +100 pts" },
      { icon: <Star         className={ROW_ICON_CLASS} />, label: "Difficulty multiplier", value: "×1.0" },
    ],
    tip: "Focus on the badge first — it's usually the quickest tell.",
  },
  custom: {
    heading: "Custom Mode",
    icon: <SlidersHorizontal className="w-8 h-8 text-blue-400" />,
    description: "Type make and model separately. Autocomplete helps.",
    difficulty: 2,
    difficultyLabel: "Intermediate",
    rows: [
      { icon: <CheckCircle2 className={ROW_ICON_CLASS} />, label: "Correct make",        value: "+300 pts" },
      { icon: <Target       className={ROW_ICON_CLASS} />, label: "Correct model",       value: "+400 pts" },
      { icon: <Clock        className={ROW_ICON_CLASS} />, label: "Speed bonus",         value: "up to +100 pts" },
      { icon: <Star         className={ROW_ICON_CLASS} />, label: "Difficulty multiplier", value: "×1.0" },
    ],
    tip: "Make and model score independently — partial credit counts.",
  },
  standard: {
    heading: "Standard Mode",
    icon: <Gauge className="w-8 h-8 text-yellow-400" />,
    description: "Type make, model, and year. Autocomplete helps.",
    difficulty: 3,
    difficultyLabel: "Advanced",
    rows: [
      { icon: <CheckCircle2 className={ROW_ICON_CLASS} />, label: "Correct make",        value: "+300 pts" },
      { icon: <Target       className={ROW_ICON_CLASS} />, label: "Correct model",       value: "+400 pts" },
      { icon: <Calendar     className={ROW_ICON_CLASS} />, label: "Year bonus",          value: "up to +200 pts" },
      { icon: <Clock        className={ROW_ICON_CLASS} />, label: "Speed bonus",         value: "up to +100 pts" },
      { icon: <Star         className={ROW_ICON_CLASS} />, label: "Difficulty multiplier", value: "×1.7" },
    ],
    tip: "Commit to a year. Being within 2 still earns +120.",
  },
  time_attack: {
    heading: "Time Attack",
    icon: <Timer className="w-8 h-8 text-orange-400" />,
    description: "30 seconds per round. Same as Standard, but faster.",
    difficulty: 4,
    difficultyLabel: "Expert",
    rows: [
      { icon: <CheckCircle2 className={ROW_ICON_CLASS} />, label: "Correct make",        value: "+300 pts" },
      { icon: <Target       className={ROW_ICON_CLASS} />, label: "Correct model",       value: "+400 pts" },
      { icon: <Calendar     className={ROW_ICON_CLASS} />, label: "Year bonus",          value: "up to +200 pts" },
      { icon: <Clock        className={ROW_ICON_CLASS} />, label: "Speed bonus",         value: "up to +100 pts" },
      { icon: <Star         className={ROW_ICON_CLASS} />, label: "Difficulty multiplier", value: "×2.0" },
    ],
    tip: "Lock in early — every second you hesitate eats your speed bonus.",
  },
  hardcore: {
    heading: "Hardcore Mode",
    icon: <Flame className="w-8 h-8 text-red-400" />,
    description: "Panels slowly reveal the car. Guess early for a bigger multiplier.",
    difficulty: 5,
    difficultyLabel: "Extreme",
    rows: [
      { icon: <CheckCircle2 className={ROW_ICON_CLASS} />, label: "Correct make",        value: "+300 pts" },
      { icon: <Target       className={ROW_ICON_CLASS} />, label: "Correct model",       value: "+400 pts" },
      { icon: <Calendar     className={ROW_ICON_CLASS} />, label: "Year bonus",          value: "up to +200 pts" },
      { icon: <Clock        className={ROW_ICON_CLASS} />, label: "Speed bonus",         value: "up to +100 pts" },
      { icon: <Star         className={ROW_ICON_CLASS} />, label: "Difficulty multiplier", value: "×1.0–×4.0" },
    ],
    tip: "Guess after the first panel for the maximum ×4.0 multiplier.",
  },
  practice: {
    heading: "Practice Mode",
    icon: <Dumbbell className="w-8 h-8 text-muted-foreground" />,
    description: "No score, no pressure. Train your eye without it counting.",
    difficulty: 0,
    difficultyLabel: "No pressure",
    rows: [],
    tip: "Take your time and learn what to look for.",
  },
};

const STORAGE_KEY_PREFIX = "ag_scoring_intro_dismissed_";

interface Props {
  mode: string;
  onDismiss: () => void;
}

export function ScoringIntro({ mode, onDismiss }: Props) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const config = MODE_INTROS[mode] ?? MODE_INTROS.standard;

  function handleStart() {
    if (dontShowAgain) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${mode}`, "1");
    }
    onDismiss();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm px-4 pb-4 sm:pb-0"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="relative w-full max-w-sm bg-card border border-white/10 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[calc(100dvh-2rem)]"
      >
        {/* Close */}
        <button
          onClick={onDismiss}
          aria-label="Close"
          className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-5">
          <p className="text-xs font-mono tracking-widest uppercase text-primary mb-2">
            How scoring works
          </p>
          <div className="flex items-center gap-3 mb-3">
            {config.icon}
            <h2 className="text-3xl font-black tracking-widest uppercase leading-none">
              {config.heading}
            </h2>
          </div>
          <p className="text-sm text-white/60 leading-relaxed">{config.description}</p>
        </div>

        {/* Difficulty meter */}
        {config.difficulty > 0 && (
          <div className="flex items-center gap-2 mb-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 flex-1 rounded-sm",
                  i < config.difficulty ? "bg-green-400" : "bg-white/10"
                )}
              />
            ))}
            <span className="text-sm font-bold text-white ml-1 whitespace-nowrap">
              {config.difficultyLabel}
            </span>
          </div>
        )}

        {/* Points breakdown */}
        {config.rows.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-mono tracking-widest uppercase text-white/30 mb-2">
              Points breakdown
            </p>
            <div className="space-y-2">
              {config.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {row.icon}
                    <span className="text-sm text-white/80">{row.label}</span>
                  </div>
                  <span className="text-sm font-black text-white whitespace-nowrap">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tip */}
        <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3 mb-5">
          <Zap className="w-5 h-5 shrink-0 text-yellow-400 mt-0.5" />
          <p className="text-sm text-white/70">
            <span className="font-bold text-yellow-400">Tip: </span>
            {config.tip}
          </p>
        </div>

        {/* Don't show again */}
        <label className="flex items-center gap-3 cursor-pointer group mb-4 py-1">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-5 h-5 rounded accent-primary cursor-pointer shrink-0"
          />
          <span className="text-sm text-white/50 group-hover:text-white transition-colors">
            Don&apos;t show this again
          </span>
        </label>

        {/* CTA */}
        <button
          onClick={handleStart}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white font-black tracking-widest uppercase py-4 rounded-2xl hover:brightness-110 transition-all text-base"
        >
          Let&apos;s Go <ChevronRight className="w-5 h-5" />
        </button>
      </motion.div>
    </motion.div>
  );
}

export function shouldShowIntro(mode: string): boolean {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(`${STORAGE_KEY_PREFIX}${mode}`);
}
