"use client";

import { Tachometer } from "@/app/components/ui/Tachometer";
import { cn } from "@/app/lib/utils";

interface Props {
  score: number;
  grade: string;
  gradeColor: string;
  approxMax: number;
  personalBest: number | null;
}

export function ScorePanel({ score, grade, gradeColor, approxMax, personalBest }: Props) {
  return (
    <div className="grid grid-cols-[2fr_3fr] sm:grid-cols-2 border-t border-white/10">
      <div className="flex flex-col items-center justify-center py-8 px-4 border-r border-white/10">
        <div className={cn("text-7xl sm:text-8xl font-black leading-none mb-3", gradeColor)}>
          {grade}
        </div>
        <div className="text-4xl sm:text-5xl font-black text-white leading-none">
          {score.toLocaleString()}
        </div>
        <div className="text-xs text-muted-foreground font-mono tracking-widest mt-2 uppercase">
          Points
        </div>
        {personalBest !== null && personalBest <= score && score > 0 && (
          <p className="mt-2 text-xs text-green-400 font-bold tracking-widest uppercase">New PB!</p>
        )}
        {personalBest !== null && personalBest > score && (
          <p className="mt-2 text-xs text-muted-foreground">
            PB: {personalBest.toLocaleString()}
          </p>
        )}
      </div>
      <div className="flex flex-col items-center justify-center py-6 px-2">
        <Tachometer score={score} maxScore={approxMax} size={300} instanceId="results" variant="results" />
        <p className="text-xs text-muted-foreground font-mono tracking-widest mt-3 uppercase">
          Speed Rating
        </p>
      </div>
    </div>
  );
}
