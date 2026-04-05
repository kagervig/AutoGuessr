"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy } from "lucide-react";
import { MODES } from "@/app/lib/constants";
import { cn } from "@/app/lib/utils";

const PERIODS = [
  { id: "day", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "alltime", label: "All Time" },
] as const;
type PeriodId = (typeof PERIODS)[number]["id"];

// Leaderboard excludes practice mode
const LEADERBOARD_MODES = MODES.filter((m) => m.id !== "practice");

interface LeaderboardEntry {
  rank: number;
  username: string;
  totalScore: number;
  gamesPlayed: number;
}

interface Props {
  username: string;
  initialMode?: string;
}

export default function LeaderboardScreen({ username, initialMode }: Props) {
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodId>("alltime");
  const [mode, setMode] = useState(initialMode ?? "");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ period });
    if (mode) params.set("mode", mode);
    fetch(`/api/leaderboard?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Unexpected response");
        setEntries(data);
      })
      .catch(() => setError("Failed to load leaderboard."))
      .finally(() => setLoading(false));
  }, [period, mode]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-panel border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors text-sm font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Garage
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="font-display font-black tracking-widest uppercase text-sm">Leaderboard</span>
          </div>
          <div className="w-20" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Period tabs */}
        <div className="flex glass-panel rounded-xl p-1 border border-white/10">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={cn(
                "flex-1 rounded-lg py-2 text-sm font-bold tracking-wider uppercase transition-colors",
                period === p.id
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Mode filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMode("")}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              mode === ""
                ? "border-primary bg-primary/10 text-primary"
                : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
            )}
          >
            All modes
          </button>
          {LEADERBOARD_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                mode === m.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {error && <p className="text-center text-red-400">{error}</p>}

        {!loading && !error && entries.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No scores yet. Be the first!</p>
        )}

        {!loading && !error && entries.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            {entries.map((entry) => {
              const isMe = !!(username && entry.username === username);
              const rankColor =
                entry.rank === 1 ? "text-yellow-400" :
                entry.rank === 2 ? "text-zinc-300" :
                entry.rank === 3 ? "text-amber-700" :
                "text-muted-foreground";

              return (
                <div
                  key={entry.rank}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3",
                    isMe ? "border-primary/40 bg-primary/10" : "border-white/10 bg-white/5"
                  )}
                >
                  <span className={cn("w-6 shrink-0 text-center text-sm font-black", rankColor)}>
                    {entry.rank}
                  </span>
                  <span className={cn("flex-1 truncate text-sm font-semibold", isMe ? "text-primary" : "text-zinc-200")}>
                    {entry.username}
                    {isMe && <span className="ml-1.5 text-xs font-normal text-primary/70">(you)</span>}
                  </span>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-white">{entry.totalScore.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{entry.gamesPlayed}g</p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
