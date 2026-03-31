"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface GuessData {
  isCorrect: boolean;
  makePoints: number;
  modelPoints: number;
  yearBonus: number | null;
  timeBonus: number;
  pointsEarned: number;
  yearDelta: number | null;
}

interface RoundData {
  sequenceNumber: number;
  imageUrl: string;
  image: {
    filename: string;
    vehicleId: string;
    vehicle: {
      make: string;
      model: string;
      year: number;
      countryOfOrigin: string;
    };
  };
  guess: GuessData | null;
}

interface SessionData {
  id: string;
  mode: string;
  finalScore: number | null;
  rounds: RoundData[];
  personalBest: number | null;
}

interface Props {
  sessionId: string;
  mode: string;
  username: string;
}

const HARD_MODES = ["hard", "hardcore", "competitive"];

export default function ResultsScreen({ sessionId, mode, username }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/session?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setSession(data);
      })
      .catch(() => setError("Failed to load results."));
  }, [sessionId]);

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-900 px-4">
        <p className="text-center text-red-400">{error}</p>
        <button onClick={() => router.push("/")} className="rounded-lg bg-zinc-800 px-5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700">
          Back to home
        </button>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-900">
        <p className="text-zinc-500">Loading results…</p>
      </main>
    );
  }

  const correct = session.rounds.filter((r) => r.guess?.isCorrect).length;
  const total = session.rounds.length;
  const score = session.finalScore ?? 0;

  return (
    <main className="min-h-screen bg-zinc-900 px-4 py-8">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">
            {username ? `Game over, ${username}!` : "Game over!"}
          </h1>
          <p className="mt-3 text-4xl font-bold text-amber-400">
            {score.toLocaleString()} <span className="text-xl text-zinc-400">pts</span>
          </p>
          <p className="mt-1 text-zinc-400">
            <span className="font-semibold text-zinc-200">{correct}</span> / {total} correct
          </p>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-zinc-600">{mode} mode</p>
          {session.personalBest !== null && session.personalBest > score && (
            <p className="mt-1 text-xs text-zinc-500">
              Personal best: {session.personalBest.toLocaleString()} pts
            </p>
          )}
          {session.personalBest !== null && session.personalBest <= score && score > 0 && (
            <p className="mt-1 text-xs text-green-400">New personal best!</p>
          )}
        </div>

        {/* Round breakdown */}
        <div className="space-y-2">
          {session.rounds.map((round) => {
            const v = round.image.vehicle;
            const label = HARD_MODES.includes(mode) ? `${v.year} ${v.make} ${v.model}` : `${v.make} ${v.model}`;
            const g = round.guess;
            const isCorrect = g?.isCorrect ?? false;

            return (
              <div
                key={round.sequenceNumber}
                className={`rounded-xl border px-3 py-3 ${
                  isCorrect ? "border-green-800 bg-green-950/30" : "border-zinc-800 bg-zinc-800/40"
                }`}
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
                      <p className="text-xs text-zinc-500">{v.countryOfOrigin}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {g ? (
                        <>
                          <p className={`text-sm font-bold ${isCorrect ? "text-green-400" : "text-zinc-500"}`}>
                            {g.pointsEarned > 0 ? `+${g.pointsEarned.toLocaleString()}` : "0"}
                          </p>
                          {!isCorrect && (
                            <p className="text-xs text-red-500">missed</p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-zinc-600">no guess</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Score breakdown for hard modes */}
                {g && HARD_MODES.includes(mode) && g.pointsEarned > 0 && (
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-500">
                    {g.makePoints > 0 && <span>make +{g.makePoints}</span>}
                    {g.modelPoints > 0 && <span>model +{g.modelPoints}</span>}
                    {g.yearBonus != null && g.yearBonus > 0 && <span>year +{g.yearBonus}</span>}
                    {g.timeBonus > 0 && <span>speed +{g.timeBonus}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/")}
            className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
          >
            Home
          </button>
          <button
            onClick={() => {
              const params = new URLSearchParams({ mode, ...(username ? { username } : {}) });
              router.push(`/game?${params.toString()}`);
            }}
            className="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-bold text-zinc-900 hover:bg-amber-400"
          >
            Play Again
          </button>
        </div>

        {/* Leaderboard link — only for named players in non-practice modes */}
        {username && mode !== "practice" && (
          <button
            onClick={() => router.push(`/leaderboard?mode=${mode}`)}
            className="w-full text-center text-sm text-zinc-600 underline-offset-2 hover:text-zinc-400 hover:underline"
          >
            View leaderboard
          </button>
        )}
      </div>
    </main>
  );
}
