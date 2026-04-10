"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";
import type { RoundData, GuessData } from "./types";

const HARD_MODES = ["standard", "hardcore", "time_attack"];

function RoundRow({ round, mode }: { round: RoundData; mode: string }) {
  const v = round.image.vehicle;
  const label = `${v.make} ${v.model}`;
  const g: GuessData | null = round.guess;
  const isCorrect = g?.isCorrect ?? false;
  const missed = !g || g.pointsEarned === 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden flex">
      {/* Image — 16:9 */}
      <div className="aspect-video w-1/3 sm:w-1/4 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={round.imageUrl}
          alt={label}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-between gap-2 px-3 sm:px-5 py-3 min-w-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-black text-white leading-tight truncate">{label}</p>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span className="text-xs border border-white/20 rounded px-1.5 py-0.5 font-mono uppercase text-muted-foreground">
              {v.countryOfOrigin}
            </span>
            {HARD_MODES.includes(mode) && (
              <span className="text-xs border border-white/20 rounded px-1.5 py-0.5 font-mono text-muted-foreground">
                {v.year}
              </span>
            )}
          </div>

          {/* Score breakdown */}
          {g && g.pointsEarned > 0 && (
            <div className="flex gap-4 mt-2">
              {g.makePoints > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Make</p>
                  <p className="text-xs sm:text-sm font-bold text-white">+{g.makePoints}</p>
                </div>
              )}
              {g.modelPoints > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Model</p>
                  <p className="text-xs sm:text-sm font-bold text-white">+{g.modelPoints}</p>
                </div>
              )}
              {g.yearBonus != null && g.yearBonus > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Year</p>
                  <p className="text-xs sm:text-sm font-bold text-white">+{g.yearBonus}</p>
                </div>
              )}
              {g.timeBonus > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Speed</p>
                  <p className="text-xs sm:text-sm font-bold text-white">+{g.timeBonus}</p>
                </div>
              )}
              {g.modeMultiplier > 1 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mult</p>
                  <p className="text-xs sm:text-sm font-bold text-yellow-400">×{g.modeMultiplier.toFixed(1)}</p>
                </div>
              )}
              {g.proBonus > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pro</p>
                  <p className="text-xs sm:text-sm font-bold text-yellow-400">+{g.proBonus}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Points */}
        <div className="shrink-0 text-right">
          <p className={cn(
            "text-2xl sm:text-4xl font-black leading-none",
            missed ? "text-orange-500" : "text-green-400"
          )}>
            {g && g.pointsEarned > 0 ? `+${g.pointsEarned.toLocaleString()}` : "0"}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
            {missed ? "Missed Round" : "Points Earned"}
          </p>
        </div>
      </div>
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
        <div className="border-t border-white/10 p-4 space-y-3">
          {rounds.map((round) => (
            <RoundRow key={round.sequenceNumber} round={round} mode={mode} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
