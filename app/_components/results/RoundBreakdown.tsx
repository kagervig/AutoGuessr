"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";
import type { RoundData, GuessData } from "./types";

const HARD_MODES = ["standard", "hardcore", "time_attack"];

function RoundRow({ round, mode }: { round: RoundData; mode: string }) {
  const v = round.image.vehicle;
  const label = HARD_MODES.includes(mode)
    ? `${v.year} ${v.make} ${v.model}`
    : `${v.make} ${v.model}`;
  const g: GuessData | null = round.guess;
  const isCorrect = g?.isCorrect ?? false;

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-3",
        isCorrect ? "border-green-800/50 bg-green-950/20" : "border-white/10 bg-white/5"
      )}
    >
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={round.imageUrl}
          alt={label}
          loading="lazy"
          className="h-12 w-16 shrink-0 rounded-lg object-cover"
        />
        <div className="flex flex-1 items-start justify-between gap-2 min-w-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-100 truncate">{label}</p>
            <p className="text-xs text-muted-foreground">{v.countryOfOrigin}</p>
          </div>
          <div className="shrink-0 text-right">
            {g ? (
              <>
                <p className={cn("text-sm font-bold", isCorrect ? "text-green-400" : "text-muted-foreground")}>
                  {g.pointsEarned > 0 ? `+${g.pointsEarned.toLocaleString()}` : "0"}
                </p>
                {!isCorrect && <p className="text-xs text-red-500">missed</p>}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">no guess</p>
            )}
          </div>
        </div>
      </div>

      {g && g.pointsEarned > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {g.makePoints > 0 && <span>make +{g.makePoints}</span>}
          {g.modelPoints > 0 && <span>model +{g.modelPoints}</span>}
          {g.yearBonus != null && g.yearBonus > 0 && (
            <span>
              year +{g.yearBonus}
              {g.yearDelta != null && g.yearDelta > 0 && (
                <span className="text-muted-foreground/50 ml-1">({g.yearDelta} off)</span>
              )}
            </span>
          )}
          {g.timeBonus > 0 && <span>speed +{g.timeBonus}</span>}
          {g.modeMultiplier > 1 && <span className="text-yellow-400/80">×{g.modeMultiplier.toFixed(1)}</span>}
          {g.proBonus > 0 && <span className="text-yellow-400">pro +{g.proBonus}</span>}
        </div>
      )}
    </div>
  );
}

interface Props {
  rounds: RoundData[];
  mode: string;
}

export function RoundBreakdown({ rounds, mode }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="glass-panel rounded-2xl border border-white/10 overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-white font-bold hover:bg-white/5 transition-colors"
      >
        <span>Round Breakdown</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t border-white/10 p-4 space-y-2">
          {rounds.map((round) => (
            <RoundRow key={round.sequenceNumber} round={round} mode={mode} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
