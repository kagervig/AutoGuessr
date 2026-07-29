"use client";
// Per-round result panel shown below the calendar when a completed day is selected.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface SummaryRound {
  roundIndex: number;
  imageUrl: string | null;
  correctVehicleLabel: string;
  guessedVehicleLabel: string | null;
  roundScore: number;
}

interface Props {
  dateStr: string;
  day: number;
  monthName: string;
  score: number;
  rank: number;
  totalPlayers: number;
  grade: string;
  gradeColor: string;
  playerId: string | null;
  onClose: () => void;
}

export function DailyChallengeDrawer({
  dateStr,
  day,
  monthName,
  score,
  rank,
  totalPlayers,
  grade,
  gradeColor,
  playerId,
  onClose,
}: Props) {
  const [rounds, setRounds] = useState<SummaryRound[] | null>(null);

  useEffect(() => {
    if (!playerId) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ playerId });
    fetch(`/api/daily-challenge/${dateStr}/summary?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((json: { rounds?: SummaryRound[] }) => {
        if (json.rounds) setRounds(json.rounds);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [dateStr, playerId]);

  const topPct = Math.round(((totalPlayers - rank) / totalPlayers) * 100);
  const correctCount = rounds?.filter((r) => r.roundScore > 0).length ?? 0;

  return (
    <div
      className="mt-4 rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(155deg, #14110f, #0f0e0c)",
        border: `1px solid ${gradeColor}35`,
        boxShadow: `0 16px 40px ${gradeColor}18`,
      }}
    >
      <div className="h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${gradeColor}, transparent)` }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[10px] font-black tracking-[0.22em] text-white/40 uppercase mb-0.5">
              {monthName} {day}, 2026
            </div>
            <div className="font-black text-xl text-white leading-tight">Daily Challenge</div>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="text-white/30 hover:text-white transition-colors text-lg font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div
            className="rounded-xl px-3 py-3 text-center"
            style={{ background: `${gradeColor}14`, border: `1px solid ${gradeColor}35` }}
          >
            <div className="text-[9px] font-black tracking-[0.2em] text-white/40 uppercase mb-1">Grade</div>
            <div className="font-black text-3xl leading-none" style={{ color: gradeColor }}>{grade}</div>
          </div>

          <div className="rounded-xl px-3 py-3 text-center bg-white/5 border border-white/10">
            <div className="text-[9px] font-black tracking-[0.2em] text-white/40 uppercase mb-1">Score</div>
            <div className="font-black text-lg text-white tabular-nums">{score.toLocaleString()}</div>
          </div>

          <div className="rounded-xl px-3 py-3 text-center bg-white/5 border border-white/10">
            <div className="text-[9px] font-black tracking-[0.2em] text-white/40 uppercase mb-1">Rank</div>
            <div className="font-black text-lg text-white tabular-nums">#{rank}</div>
            <div className="text-[8px] text-white/30 font-mono">of {totalPlayers.toLocaleString()}</div>
          </div>

          <div className="col-span-3 rounded-xl px-3 py-2.5 bg-white/5 border border-white/10">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] font-black tracking-widest text-white/40 uppercase">Percentile</span>
              <span className="text-[9px] font-black text-white/70">Top {topPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${topPct}%` }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${gradeColor}, ${gradeColor}99)` }}
              />
            </div>
          </div>
        </div>

        {/* Rounds */}
        {rounds ? (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[9px] font-black tracking-[0.25em] text-white/35 uppercase">Rounds</span>
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[9px] font-mono text-white/25">{correctCount}/{rounds.length} correct</span>
            </div>

            <div className="space-y-1.5">
              {rounds.map((round, i) => {
                const correct = round.roundScore > 0;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.03, ease: "easeOut" }}
                    className="flex items-center gap-2.5 rounded-xl overflow-hidden"
                    style={{
                      background: correct
                        ? "linear-gradient(95deg, rgba(74,222,128,0.07) 0%, rgba(74,222,128,0.02) 100%)"
                        : "linear-gradient(95deg, rgba(248,113,113,0.07) 0%, rgba(248,113,113,0.02) 100%)",
                      border: correct
                        ? "1px solid rgba(74,222,128,0.18)"
                        : "1px solid rgba(248,113,113,0.16)",
                    }}
                  >
                    <div
                      className="w-7 self-stretch flex items-center justify-center flex-shrink-0 text-[9px] font-black font-mono"
                      style={{
                        color: correct ? "rgba(74,222,128,0.7)" : "rgba(248,113,113,0.6)",
                        background: correct ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
                        borderRight: correct ? "1px solid rgba(74,222,128,0.12)" : "1px solid rgba(248,113,113,0.1)",
                      }}
                    >
                      {i + 1}
                    </div>

                    {round.imageUrl && (
                      <div className="w-16 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-black">
                        <img
                          src={round.imageUrl}
                          alt={round.correctVehicleLabel}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 py-2 pr-1">
                      <div className="text-[10px] font-black text-white leading-tight truncate">
                        {round.correctVehicleLabel}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className="text-[9px] font-bold leading-none"
                          style={{ color: correct ? "rgba(74,222,128,0.7)" : "rgba(248,113,113,0.65)" }}
                        >
                          {correct ? "✓" : "✗"}
                        </span>
                        <span
                          className="text-[9px] truncate leading-none"
                          style={{ color: correct ? "rgba(74,222,128,0.6)" : "rgba(248,113,113,0.55)" }}
                        >
                          {round.guessedVehicleLabel ?? "—"}
                        </span>
                      </div>
                    </div>

                    <div
                      className="text-[11px] font-black tabular-nums pr-3 flex-shrink-0"
                      style={{ color: correct ? "rgba(74,222,128,0.8)" : "rgba(255,255,255,0.15)" }}
                    >
                      {correct ? `+${round.roundScore.toLocaleString()}` : "—"}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
