"use client";
// Sticky right-column panel: tachometer score gauge and mode description card.
import { Star, Target, CheckCircle2, Clock, Calendar, Zap } from "lucide-react";
import { Tachometer } from "@/app/components/ui/Tachometer";
import { cn } from "@/app/lib/utils";

interface RuleRow {
  icon: React.ReactNode;
  label: string;
  value: string;
}

interface ModeRule {
  description: string;
  difficulty: number;
  difficultyLabel: string;
  rows: RuleRow[];
  tip: string;
}

const ROW_ICON_CLASS = "w-3.5 h-3.5 shrink-0 text-white/30";

const MODE_RULES: Record<string, ModeRule> = {
  daily: {
    description: "One chance. Identify 10 cars from today's collection. Multiple choice.",
    difficulty: 2,
    difficultyLabel: "Competitive",
    rows: [
      { icon: <CheckCircle2 className={ROW_ICON_CLASS} />, label: "Correct make",        value: "+300 pts" },
      { icon: <Target       className={ROW_ICON_CLASS} />, label: "Correct model",       value: "+400 pts" },
      { icon: <Clock        className={ROW_ICON_CLASS} />, label: "Speed bonus",         value: "up to +100 pts" },
      { icon: <Zap          className={ROW_ICON_CLASS} />, label: "Daily Discovery",     value: "+1,000 pts" },
    ],
    tip: "You only get one attempt per day. Make it count!",
  },
  easy: {
    description: "Pick the right car from 4 multiple-choice answers.",
    difficulty: 1,
    difficultyLabel: "Beginner",
    rows: [
      { icon: <CheckCircle2 className={ROW_ICON_CLASS} />, label: "Correct make",        value: "+300 pts" },
      { icon: <Target       className={ROW_ICON_CLASS} />, label: "Correct model",       value: "+400 pts" },
      { icon: <Clock        className={ROW_ICON_CLASS} />, label: "Speed bonus",         value: "up to +100 pts" },
      { icon: <Star         className={ROW_ICON_CLASS} />, label: "Multiplier", value: "×1.0" },
    ],
    tip: "Focus on the badge first — it's usually the quickest tell.",
  },
  custom: {
    description: "Type make and model separately. Autocomplete helps.",
    difficulty: 2,
    difficultyLabel: "Intermediate",
    rows: [
      { icon: <CheckCircle2 className={ROW_ICON_CLASS} />, label: "Correct make",        value: "+300 pts" },
      { icon: <Target       className={ROW_ICON_CLASS} />, label: "Correct model",       value: "+400 pts" },
      { icon: <Clock        className={ROW_ICON_CLASS} />, label: "Speed bonus",         value: "up to +100 pts" },
      { icon: <Star         className={ROW_ICON_CLASS} />, label: "Multiplier", value: "×1.0" },
    ],
    tip: "Make and model score independently — partial credit counts.",
  },
  standard: {
    description: "Type make, model, and year. Autocomplete helps.",
    difficulty: 3,
    difficultyLabel: "Advanced",
    rows: [
      { icon: <CheckCircle2 className={ROW_ICON_CLASS} />, label: "Correct make",        value: "+300 pts" },
      { icon: <Target       className={ROW_ICON_CLASS} />, label: "Correct model",       value: "+400 pts" },
      { icon: <Calendar     className={ROW_ICON_CLASS} />, label: "Year bonus",          value: "up to +200 pts" },
      { icon: <Clock        className={ROW_ICON_CLASS} />, label: "Speed bonus",         value: "up to +100 pts" },
      { icon: <Star         className={ROW_ICON_CLASS} />, label: "Multiplier", value: "×1.7" },
    ],
    tip: "Commit to a year. Being within 2 still earns +120.",
  },
  time_attack: {
    description: "30 seconds per round. Same as Standard, but faster.",
    difficulty: 4,
    difficultyLabel: "Expert",
    rows: [
      { icon: <CheckCircle2 className={ROW_ICON_CLASS} />, label: "Correct make",        value: "+300 pts" },
      { icon: <Target       className={ROW_ICON_CLASS} />, label: "Correct model",       value: "+400 pts" },
      { icon: <Calendar     className={ROW_ICON_CLASS} />, label: "Year bonus",          value: "up to +200 pts" },
      { icon: <Clock        className={ROW_ICON_CLASS} />, label: "Speed bonus",         value: "up to +100 pts" },
      { icon: <Star         className={ROW_ICON_CLASS} />, label: "Multiplier", value: "×2.0" },
    ],
    tip: "Lock in early — every second you hesitate eats your speed bonus.",
  },
  hardcore: {
    description: "Panels slowly reveal the car. Guess early for a bigger multiplier.",
    difficulty: 5,
    difficultyLabel: "Extreme",
    rows: [
      { icon: <CheckCircle2 className={ROW_ICON_CLASS} />, label: "Correct make",        value: "+300 pts" },
      { icon: <Target       className={ROW_ICON_CLASS} />, label: "Correct model",       value: "+400 pts" },
      { icon: <Calendar     className={ROW_ICON_CLASS} />, label: "Year bonus",          value: "up to +200 pts" },
      { icon: <Clock        className={ROW_ICON_CLASS} />, label: "Speed bonus",         value: "up to +100 pts" },
      { icon: <Star         className={ROW_ICON_CLASS} />, label: "Multiplier", value: "×1.0–×4.0" },
    ],
    tip: "Guess after the first panel for the maximum ×4.0 multiplier.",
  },
  practice: {
    description: "No score, no pressure. Train your eye without it counting.",
    difficulty: 0,
    difficultyLabel: "No pressure",
    rows: [],
    tip: "Take your time and learn what to look for.",
  },
};

interface Props {
  mode: string;
  modeLabel: string;
  score: number;
  maxTotalScore: number;
  currentIndex: number;
  totalRounds: number;
  daily?: boolean;
}

export function ScoreSidebar({ mode, modeLabel, score, maxTotalScore, currentIndex, totalRounds, daily }: Props) {
  const rules = daily ? MODE_RULES.daily : (MODE_RULES[mode] ?? MODE_RULES.standard);
  const displayLabel = daily ? "Daily Challenge" : modeLabel;

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
      <div className="glass-panel rounded-2xl p-5 border border-white/10 w-full">
        <div className="mb-4">
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-primary mb-1">
            Game Rules
          </p>
          <h3 className="text-lg font-black tracking-widest uppercase leading-none">
            {displayLabel} Mode
          </h3>
        </div>

        {/* Difficulty meter */}
        {rules.difficulty > 0 && (
          <div className="flex items-center gap-1.5 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  i < rules.difficulty ? "bg-green-500" : "bg-white/10"
                )}
              />
            ))}
            <span className="text-[10px] font-bold text-white/50 ml-1 uppercase tracking-wider">
              {rules.difficultyLabel}
            </span>
          </div>
        )}

        <p className="text-xs text-white/60 leading-relaxed mb-4">
          {rules.description}
        </p>

        {/* Points breakdown */}
        {rules.rows.length > 0 && (
          <div className="space-y-1.5 mb-4">
            {rules.rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-2 py-1 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-2">
                  {row.icon}
                  <span className="text-[10px] text-white/40 uppercase tracking-tight">{row.label}</span>
                </div>
                <span className="text-[10px] font-mono text-white/80">{row.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tip */}
        <div className="flex gap-2.5 bg-white/5 rounded-xl p-3">
          <Zap className="w-3.5 h-3.5 shrink-0 text-yellow-500 mt-0.5" />
          <p className="text-[10px] text-white/50 leading-normal">
            <span className="font-bold text-yellow-500/80">TIP: </span>
            {rules.tip}
          </p>
        </div>
      </div>
    </div>
  );
}
