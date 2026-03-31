"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

const PERIODS = [
  { id: "day", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "alltime", label: "All Time" },
] as const;
type PeriodId = (typeof PERIODS)[number]["id"];

const MODES = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
  { id: "hardcore", label: "Hardcore" },
  { id: "competitive", label: "Competitive" },
];

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
    <main className="min-h-screen bg-zinc-900 px-4 py-8">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
          <button
            onClick={() => router.push("/")}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
          >
            Home
          </button>
        </div>

        {/* Period tabs */}
        <div className="flex rounded-xl border border-zinc-700 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={[
                "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
                period === p.id
                  ? "bg-amber-500 text-zinc-900"
                  : "text-zinc-400 hover:text-zinc-200",
              ].join(" ")}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Mode filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMode("")}
            className={[
              "rounded-full border px-3 py-1 text-xs transition-colors",
              mode === ""
                ? "border-amber-500 bg-amber-500/10 text-amber-400"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300",
            ].join(" ")}
          >
            All modes
          </button>
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={[
                "rounded-full border px-3 py-1 text-xs transition-colors",
                mode === m.id
                  ? "border-amber-500 bg-amber-500/10 text-amber-400"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300",
              ].join(" ")}
            >
              {m.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-center text-zinc-500">Loading…</p>}
        {error && <p className="text-center text-red-400">{error}</p>}

        {!loading && !error && entries.length === 0 && (
          <p className="text-center text-zinc-500">No scores yet. Be the first!</p>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="space-y-1.5">
            {entries.map((entry) => {
              const isMe = username && entry.username === username;
              return (
                <div
                  key={entry.rank}
                  className={[
                    "flex items-center gap-3 rounded-xl border px-4 py-3",
                    isMe ? "border-amber-600 bg-amber-950/30" : "border-zinc-800 bg-zinc-800/40",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "w-6 shrink-0 text-center text-sm font-bold",
                      entry.rank === 1
                        ? "text-amber-400"
                        : entry.rank === 2
                          ? "text-zinc-300"
                          : entry.rank === 3
                            ? "text-amber-700"
                            : "text-zinc-600",
                    ].join(" ")}
                  >
                    {entry.rank}
                  </span>
                  <span className={`flex-1 truncate text-sm font-semibold ${isMe ? "text-amber-300" : "text-zinc-200"}`}>
                    {entry.username}
                    {isMe && <span className="ml-1.5 text-xs font-normal text-amber-500">(you)</span>}
                  </span>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-white">{entry.totalScore.toLocaleString()}</p>
                    <p className="text-xs text-zinc-500">{entry.gamesPlayed}g</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
