"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Flag, RotateCcw, ArrowLeft, Trophy, CheckCircle, Share2, ChevronDown, ChevronUp } from "lucide-react";
import { MODES } from "@/app/lib/constants";
import { Tachometer } from "@/app/components/ui/Tachometer";
import { ScoringNudge } from "@/app/components/ui/ScoringNudge";
import { cn } from "@/app/lib/utils";
import { calcGrade, APPROX_MAX_PER_ROUND } from "@/app/lib/grade";

const MODE_LABELS: Record<string, string> = Object.fromEntries(
  MODES.map((m) => [m.id, m.label])
);

const HARD_MODES = ["standard", "hardcore", "time_attack"];

interface GuessData {
  isCorrect: boolean;
  makePoints: number;
  modelPoints: number;
  yearBonus: number | null;
  yearDelta: number | null;
  timeBonus: number;
  modeMultiplier: number;
  proBonus: number;
  pointsEarned: number;
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
  gameId: string;
  hasToken: boolean;
  mode: string;
  username: string;
}

// Retro arcade-style 3-character initials entry, inline layout
function InitialsEntry({
  gameId,
  onSubmitted,
}: {
  gameId: string;
  onSubmitted: () => void;
}) {
  const [letters, setLetters] = useState(["", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const initials = letters.join("");
  const canSubmit = initials.length >= 1 && !submitting;

  function handleChange(index: number, raw: string) {
    const letter = raw.toUpperCase().replace(/[^A-Z]/g, "").slice(-1);
    const next = [...letters];
    next[index] = letter;
    setLetters(next);
    if (letter && index < 2) {
      inputRefs[index + 1].current?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !letters[index] && index > 0) {
      const next = [...letters];
      next[index - 1] = "";
      setLetters(next);
      inputRefs[index - 1].current?.focus();
    }
    if (e.key === "Enter" && canSubmit) {
      submit();
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/session/initials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, initials: initials.padEnd(3, "_").slice(0, 3) }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save");
        setSubmitting(false);
        return;
      }
      onSubmitted();
    } catch {
      setError("Network error");
      setSubmitting(false);
    }
  }

  return (
    <div className="px-6 py-5 border-t border-white/10 flex flex-col items-center text-center">
      <div className="flex items-center gap-2 mb-1">
        <Trophy className="w-7 h-7 text-muted-foreground" />
        <span className="text-lg sm:text-xl font-mono tracking-widest uppercase text-muted-foreground">
          Submit to Leaderboard
        </span>
      </div>
      <p className="text-base text-muted-foreground mb-3">Enter your initials</p>
      <div className="flex items-center gap-2">
        {inputRefs.map((ref, i) => (
          <input
            key={i}
            ref={ref}
            type="text"
            inputMode="text"
            maxLength={1}
            value={letters[i]}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            aria-label={`Initial ${i + 1}`}
            className={cn(
              "w-10 h-10 sm:w-14 sm:h-14 aspect-square rounded-2xl border-2 bg-white/5 text-center text-xl sm:text-3xl font-black font-mono uppercase tracking-wider text-white transition-colors outline-none shrink-0",
              letters[i]
                ? "border-primary"
                : "border-white/20 focus:border-primary/60"
            )}
            autoFocus={i === 0}
          />
        ))}
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="h-10 sm:h-14 px-4 sm:px-6 bg-primary text-white font-black tracking-widest uppercase text-sm sm:text-base rounded-xl hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Saving…" : "Submit"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function ResultsScreen({ gameId, hasToken, mode, username }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialsSubmitted, setInitialsSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(true);

  async function handleShare(score: number, grade: string) {
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
  const total = session.rounds.length;
  const approxMax = total * APPROX_MAX_PER_ROUND;
  const { grade, color: gradeColor } = calcGrade(score / approxMax);
  const modeLabel = MODE_LABELS[mode] || mode;
  const showLeaderboard = mode !== "practice" && score > 0;

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
          <div className="flex items-center justify-center gap-4 px-6 pt-6 pb-5">
            <div className="rounded-2xl bg-primary/20 p-4 shrink-0">
              <Flag className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-widest uppercase leading-tight">Race Over</h1>
              <p className="text-lg sm:text-xl font-bold tracking-widest uppercase text-muted-foreground">{modeLabel} Mode</p>
            </div>
          </div>

          {/* Score + Speed Rating */}
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
              {session.personalBest !== null && session.personalBest <= score && score > 0 && (
                <p className="mt-2 text-xs text-green-400 font-bold tracking-widest uppercase">New PB!</p>
              )}
              {session.personalBest !== null && session.personalBest > score && (
                <p className="mt-2 text-xs text-muted-foreground">
                  PB: {session.personalBest.toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex flex-col items-center justify-center py-8 px-0">
              <div className="sm:hidden">
                <Tachometer score={score} maxScore={approxMax} size={200} instanceId="results-mobile" />
              </div>
              <div className="hidden sm:block">
                <Tachometer score={score} maxScore={approxMax} size={260} instanceId="results-desktop" />
              </div>
              <p className="text-xs text-muted-foreground font-mono tracking-widest mt-3 uppercase">
                Speed Rating
              </p>
            </div>
          </div>

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
              <div className="flex items-center gap-2 text-green-400 text-lg sm:text-xl font-bold tracking-wider uppercase">
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
          <div className="flex gap-3 px-6 py-5 border-t border-white/10">
            <button
              onClick={() => {
                const params = new URLSearchParams({ mode, ...(username ? { username } : {}) });
                router.push(`/game?${params.toString()}`);
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-white font-black tracking-widest uppercase px-3 py-3 rounded-full hover:brightness-110 transition-all text-xs sm:text-sm"
            >
              <RotateCcw className="w-4 h-4 shrink-0" /> Play Again
            </button>
            <button
              onClick={() => handleShare(score, grade)}
              className="flex-1 inline-flex items-center justify-center gap-2 border border-white/20 text-white font-bold tracking-widest uppercase px-3 py-3 rounded-full hover:bg-white/10 transition-all text-xs sm:text-sm"
            >
              <Share2 className="w-4 h-4 shrink-0" />
              {copied ? "Copied!" : "Share"}
            </button>
            <button
              onClick={() => router.push("/")}
              className="flex-1 inline-flex items-center justify-center gap-2 border border-white/20 text-white font-bold tracking-widest uppercase px-3 py-3 rounded-full hover:bg-white/10 transition-all text-xs sm:text-sm"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" /> Garage
            </button>
          </div>
        </motion.div>

        {/* Scoring nudge */}
        <ScoringNudge mode={mode} score={score} />

        {/* Round breakdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-panel rounded-2xl border border-white/10 overflow-hidden"
        >
          <button
            onClick={() => setBreakdownOpen(!breakdownOpen)}
            className="w-full flex items-center justify-between px-5 py-4 text-white font-bold hover:bg-white/5 transition-colors"
          >
            <span>Round Breakdown</span>
            {breakdownOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {breakdownOpen && (
            <div className="border-t border-white/10 p-4 space-y-2">
              {session.rounds.map((round) => {
                const v = round.image.vehicle;
                const label = HARD_MODES.includes(mode)
                  ? `${v.year} ${v.make} ${v.model}`
                  : `${v.make} ${v.model}`;
                const g = round.guess;
                const isCorrect = g?.isCorrect ?? false;

                return (
                  <div
                    key={round.sequenceNumber}
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
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
