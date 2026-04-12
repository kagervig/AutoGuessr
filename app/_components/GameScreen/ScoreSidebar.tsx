"use client";
// Sticky right-column panel: tachometer score gauge and mode description card.
import { Star } from "lucide-react";
import { Tachometer } from "@/app/components/ui/Tachometer";

const MODE_DESCRIPTIONS: Record<string, string> = {
  easy: "Pick the right car from 4 choices.",
  custom: "Pick the right car from 4 choices. Filtered to your chosen collection.",
  standard: "Type make, model, and year.",
  hardcore: "Same as Standard. Panels are removed every 5 seconds to reveal the car.",
  time_attack: "Race the clock — faster answers earn bonus points.",
  practice: "No leaderboard pressure. Drill your knowledge.",
};

interface Props {
  mode: string;
  modeLabel: string;
  score: number;
  maxTotalScore: number;
  currentIndex: number;
  totalRounds: number;
}

export function ScoreSidebar({ mode, modeLabel, score, maxTotalScore, currentIndex, totalRounds }: Props) {
  return (
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
              {currentIndex + 1} / {totalRounds}
            </span>
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
          <span className="text-sm font-black tracking-widest uppercase">
            {modeLabel}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {MODE_DESCRIPTIONS[mode] ?? ""}
        </p>
      </div>
    </div>
  );
}
