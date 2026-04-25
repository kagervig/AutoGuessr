"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Flag, RotateCcw, ArrowLeft, Trophy, CheckCircle, Share2, Flame, Calendar } from "lucide-react";
import { MODES, GameMode, MAX_DAILY_ROUND_SCORE } from "@/app/lib/constants";
import { ScoringNudge } from "@/app/components/ui/ScoringNudge";
import { calcGrade } from "@/app/lib/grade";
import { InitialsEntry } from "./results/InitialsEntry";
import { ScorePanel } from "./results/ScorePanel";
import { RoundBreakdown } from "./results/RoundBreakdown";
import type { SessionData } from "./results/types";

const MODE_LABELS: Record<string, string> = Object.fromEntries(
  MODES.map((m) => [m.id, m.label])
);

interface Props {
  gameId: string;
  hasToken: boolean;
  mode: string;
  username: string;
  maxScore?: number;
}

export default function ResultsScreen({ gameId, hasToken, mode, username, maxScore }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialsSubmitted, setInitialsSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [streak] = useState(() => {
    if (typeof document === "undefined") return 0;
    const match = document.cookie.match(/(?:^|; )daily_streak=(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  });

  useEffect(() => {
    fetch(`/api/session?gameId=${gameId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setSession(data);
      })
      .catch(() => setError("Failed to load results."));
  }, [gameId]);

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
        <p className="text-center text-red-400">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 glass-panel rounded-xl px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Garage
        </button>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-muted-foreground font-mono tracking-widest text-sm uppercase">Loading results</p>
        </div>
      </main>
    );
  }

  const score = session.finalScore ?? 0;
  const approxMax = maxScore ?? 0;
  const { grade, color: gradeColor } = calcGrade(approxMax > 0 ? score / approxMax : 0);
  const modeLabel = MODE_LABELS[mode] || mode;
  const showLeaderboard = mode !== GameMode.Practice && score > 0;
  const isDaily = !!session.dailyChallengeId;

  function roundEmoji(pts: number): string {
    if (pts >= MAX_DAILY_ROUND_SCORE * 0.8) return "🟢";
    if (pts >= MAX_DAILY_ROUND_SCORE * 0.4) return "🟡";
    return "🔴";
  }

  const emojiGrid = isDaily
    ? session.rounds.map((r) => roundEmoji(r.guess?.pointsEarned ?? 0)).join("")
    : "";

  const dailyShareText = isDaily
    ? `AutoGuessr Daily #${session.dailyChallengeNumber}\n${emojiGrid}\nScore: ${score.toLocaleString()}${session.dailyRank ? ` | Rank #${session.dailyRank}` : ""}\nautoguessr.com/daily`
    : "";

  async function handleShare() {
    if (isDaily) {
      try {
        await navigator.clipboard.writeText(dailyShareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        prompt("Copy this:", dailyShareText);
      }
      return;
    }
    const url = window.location.href;
    const text = `I scored ${score.toLocaleString()} pts (Grade ${grade}) on Autoguessr — can you beat it?`;
    if (navigator.share) {
      await navigator.share({ title: "Autoguessr", text, url });
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 space-y-4">

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-3xl border border-white/10 overflow-hidden"
        >
          {/* Card header */}
          <div className="flex items-center justify-center gap-4 px-6 pt-4 pb-4">
            <div className="rounded-2xl bg-primary/20 p-4 shrink-0">
              {isDaily ? <Calendar className="w-10 h-10 text-primary" /> : <Flag className="w-10 h-10 text-primary" />}
            </div>
            <div>
              {isDaily ? (
                <>
                  <p className="text-xs font-bold tracking-widest uppercase text-primary">Daily Challenge</p>
                  <h1 className="text-xl sm:text-2xl font-black tracking-widest uppercase leading-tight">
                    #{session.dailyChallengeNumber}
                  </h1>
                </>
              ) : (
                <>
                  <h1 className="text-xl sm:text-2xl font-black tracking-widest uppercase leading-tight">Race Over</h1>
                  <p className="text-base sm:text-lg font-bold tracking-widest uppercase text-muted-foreground">{modeLabel} Mode</p>
                </>
              )}
            </div>
          </div>

          <ScorePanel
            score={score}
            grade={grade}
            gradeColor={gradeColor}
            approxMax={approxMax}
            personalBest={session.personalBest}
          />

          {/* Daily challenge results */}
          {isDaily && (
            <div className="px-6 py-5 border-t border-white/10 space-y-5">
              {/* Emoji grid + streak */}
              <div className="flex flex-col items-center gap-3">
                <p className="text-3xl tracking-widest">{emojiGrid}</p>
                {streak > 0 && (
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-semibold text-orange-300">{streak}-day streak</span>
                  </div>
                )}
                {session.dailyRank && (
                  <p className="text-sm text-white/70">
                    Rank <span className="text-white font-bold">#{session.dailyRank}</span>
                  </p>
                )}
              </div>

              {/* Leaderboard */}
              {session.dailyLeaderboard.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-3">
                    <Trophy className="w-3.5 h-3.5" /> Today&apos;s Top Scores
                  </p>
                  <ol className="space-y-2">
                    {session.dailyLeaderboard.map((entry, i) => (
                      <li key={entry.id} className="flex items-center text-sm gap-3">
                        <span className="text-muted-foreground w-6 shrink-0">#{i + 1}</span>
                        <span className="font-mono font-bold text-white flex-1">{entry.initials}</span>
                        <span className="text-white/70">{entry.finalScore.toLocaleString()}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Initials entry or confirmation */}
          {showLeaderboard && hasToken && !initialsSubmitted && (
            <InitialsEntry
              gameId={gameId}
              onSubmitted={() => setInitialsSubmitted(true)}
            />
          )}

          {showLeaderboard && initialsSubmitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-6 py-5 border-t border-white/10 space-y-2 flex flex-col items-center text-center"
            >
              <div className="flex items-center gap-2 text-green-400 text-base sm:text-xl font-bold tracking-wider uppercase">
                <CheckCircle className="w-5 h-5" />
                Score saved to leaderboard
              </div>
              <button
                onClick={() => router.push(`/leaderboard?mode=${mode}`)}
                className="flex items-center gap-2 text-base text-muted-foreground hover:text-white transition-colors underline underline-offset-2"
              >
                <Trophy className="w-4 h-4" /> View leaderboard
              </button>
            </motion.div>
          )}

          {/* Action buttons */}
          <div className="flex gap-1.5 px-3 sm:px-6 py-5 border-t border-white/10">
            <button
              onClick={() => {
                if (isDaily) { router.push("/daily"); return; }
                const params = new URLSearchParams({ mode, ...(username ? { username } : {}) });
                router.push(`/game?${params.toString()}`);
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-white font-black tracking-widest uppercase px-5 py-3 rounded-full hover:brightness-110 transition-all text-xs sm:text-sm"
            >
              <RotateCcw className="w-4 h-4 shrink-0" /> {isDaily ? "Daily Home" : hasToken ? "Play Again" : "Play Game"}
            </button>
            {!hasToken && (
              <button
                onClick={() => router.push("/")}
                className="flex-1 inline-flex items-center justify-center gap-2 border border-white/20 text-white font-bold tracking-widest uppercase px-5 py-3 rounded-full hover:bg-white/10 transition-all text-xs sm:text-sm"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" /> Different Game Mode
              </button>
            )}
            {hasToken && (
              <>
                <button
                  onClick={() => handleShare()}
                  className="flex-1 inline-flex items-center justify-center gap-2 border border-white/20 text-white font-bold tracking-widest uppercase px-5 py-3 rounded-full hover:bg-white/10 transition-all text-xs sm:text-sm"
                >
                  <Share2 className="w-4 h-4 shrink-0" />
                  {copied ? "Copied!" : "Share Results"}
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="flex-1 inline-flex items-center justify-center gap-2 border border-white/20 text-white font-bold tracking-widest uppercase px-5 py-3 rounded-full hover:bg-white/10 transition-all text-xs sm:text-sm"
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" /> Garage
                </button>
              </>
            )}
          </div>
        </motion.div>

        {/* Scoring nudge */}
        {hasToken && <ScoringNudge mode={mode} score={score} />}

        <RoundBreakdown rounds={session.rounds} mode={mode} />
      </div>
    </div>
  );
}
