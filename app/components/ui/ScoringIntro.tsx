"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

export interface ModeIntroConfig {
  heading: string;
  description: string;
  pills: string[];
}

const MODE_INTROS: Record<string, ModeIntroConfig> = {
  easy: {
    heading: "Easy Mode",
    description: "Pick the right car from 4 choices. Points are scored as follows:",
    pills: ["Make +300", "Model +400", "Speed bonus up to +100", "×1.0 multiplier"],
  },
  custom: {
    heading: "Custom Mode",
    description:
      "Type the make and model, autocomplete helps to speed things up. Each scores independently — you get credit for what you know, even if you only nail one.",
    pills: ["Make +300", "Model +400", "Speed bonus up to +100", "×1.0 multiplier"],
  },
  standard: {
    heading: "Standard Mode",
    description:
      "Type the make, model, and year - autocomplete helps to speed things up. Within 5 years earns bonus points. Everything is tallied and multiplied by ×1.7.",
    pills: ["Make +300", "Model +400", "Year bonus up to +200", "Speed +100", "×1.7 multiplier"],
  },
  time_attack: {
    heading: "Time Attack",
    description:
      "30 seconds per round. Same scoring as Standard — but with half the time and a ×2.0 multiplier. Every second you sit on costs points.",
    pills: ["Make +300", "Model +400", "Year bonus up to +200", "Speed +100", "×2.0 multiplier"],
  },
  hardcore: {
    heading: "Hardcore Mode",
    description:
      "Panels slowly reveal the car. Guess before all 9 appear for a bigger multiplier — up to ×4.0 on the first panel, down to ×1.0 on the last. Bonus points for guessing the year (+/- 5 years).",
    pills: [
      "Make +300",
      "Model +400",
      "Year bonus up to +200",
      "Speed +100",
      "×1.0–×4.0 multiplier",
    ],
  },
  practice: {
    heading: "Practice Mode",
    description:
      "No score, no pressure. Use it to train your eye on makes and models without it counting against you.",
    pills: ["No points earned", "Nothing on the leaderboard"],
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm px-4 pb-6 sm:pb-0"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="w-full max-w-sm bg-card border border-white/10 rounded-3xl p-7 space-y-5 shadow-2xl"
      >
        <div className="space-y-1">
          <p className="text-xs font-mono tracking-widest uppercase text-primary">
            How scoring works
          </p>
          <h2 className="text-2xl font-black tracking-widest uppercase">{config.heading}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed pt-1">{config.description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {config.pills.map((pill) => (
            <span
              key={pill}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-mono text-white/70"
            >
              {pill}
            </span>
          ))}
        </div>

        <Link
          href="/scoring"
          className="text-xs text-muted-foreground hover:text-white transition-colors underline underline-offset-2"
        >
          Full scoring breakdown →
        </Link>

        <div className="space-y-3 pt-1">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded accent-primary cursor-pointer"
            />
            <span className="text-xs text-muted-foreground group-hover:text-white transition-colors">
              Don&apos;t show this again
            </span>
          </label>

          <button
            onClick={handleStart}
            className="w-full bg-primary text-white font-black tracking-widest uppercase py-3 rounded-full hover:brightness-110 transition-all"
          >
            Let&apos;s Go
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function shouldShowIntro(mode: string): boolean {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(`${STORAGE_KEY_PREFIX}${mode}`);
}
