// Daily challenge landing page — play today's challenge or view post-game state.
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Calendar, Flame, Trophy, ArrowRight } from "lucide-react";
import { prisma } from "@/app/lib/prisma";
import { getDailyChallenge } from "@/app/lib/daily-challenge";
import { MAX_DAILY_ROUND_SCORE } from "@/app/lib/constants";
import { Navbar } from "@/app/components/layout/Navbar";
import { Countdown } from "./_components/Countdown";
import { ShareButton } from "./_components/ShareButton";

export const metadata: Metadata = {
  title: "Daily Challenge — Autoguessr",
  description: "One new challenge every day. Can you top the leaderboard?",
};

function roundEmoji(score: number): string {
  if (score >= MAX_DAILY_ROUND_SCORE * 0.8) return "🟢";
  if (score >= MAX_DAILY_ROUND_SCORE * 0.4) return "🟡";
  return "🔴";
}

function formatDate(date: Date): string {
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

export default async function DailyPage() {
  const challenge = await getDailyChallenge();

  if (!challenge || !challenge.isPublished) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 pt-32 pb-20 text-center">
          <p className="text-muted-foreground text-lg">Today&apos;s challenge isn&apos;t ready yet. Check back soon!</p>
          <Link href="/" className="mt-6 inline-block text-sm text-primary hover:underline">← Back to home</Link>
        </main>
      </div>
    );
  }

  const cookieStore = await cookies();
  const existingSessionId = cookieStore.get(`dc_${challenge.challengeNumber}`)?.value;
  const streakStr = cookieStore.get("daily_streak")?.value;
  const streak = streakStr ? parseInt(streakStr, 10) : 0;

  // Compute seconds until next UTC midnight for the countdown
  const now = new Date();
  const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const secondsUntilMidnight = Math.floor((nextMidnight.getTime() - now.getTime()) / 1000);

  // Check if the user has completed today's challenge
  let playedData: {
    finalScore: number;
    rank: number;
    emojiGrid: string;
    leaderboard: { id: string; initials: string; finalScore: number }[];
  } | null = null;

  if (existingSessionId) {
    const session = await prisma.gameSession.findUnique({
      where: { id: existingSessionId },
      select: {
        endedAt: true,
        finalScore: true,
        rounds: {
          orderBy: { sequenceNumber: "asc" },
          select: { guess: { select: { pointsEarned: true } } },
        },
      },
    });

    if (session?.endedAt && session.finalScore !== null) {
      const [rank, leaderboard] = await Promise.all([
        prisma.gameSession.count({
          where: {
            dailyChallengeId: challenge.id,
            endedAt: { not: null },
            finalScore: { gt: session.finalScore },
          },
        }),
        prisma.gameSession.findMany({
          where: {
            dailyChallengeId: challenge.id,
            endedAt: { not: null },
            finalScore: { not: null, gt: 0 },
            initials: { not: null },
          },
          orderBy: { finalScore: "desc" },
          take: 5,
          select: { id: true, initials: true, finalScore: true },
        }),
      ]);

      const emojiGrid = session.rounds.map((r) => roundEmoji(r.guess?.pointsEarned ?? 0)).join("");

      playedData = {
        finalScore: session.finalScore,
        rank: rank + 1,
        emojiGrid,
        leaderboard: leaderboard.filter(
          (e): e is { id: string; initials: string; finalScore: number } =>
            e.initials !== null && e.finalScore !== null
        ),
      };
    }
  }

  const shareText = playedData
    ? `AutoGuessr Daily #${challenge.challengeNumber}\n${playedData.emojiGrid}\nScore: ${playedData.finalScore.toLocaleString()} | Rank #${playedData.rank}\nautoguessr.com/daily`
    : "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 pt-32 pb-20">

        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs font-bold tracking-widest uppercase text-primary mb-2">Daily Challenge</p>
          <h1 className="text-4xl sm:text-5xl font-display font-black tracking-widest uppercase text-white mb-2">
            #{challenge.challengeNumber}
          </h1>
          <p className="text-muted-foreground text-sm flex items-center justify-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(challenge.date)}
          </p>
        </div>

        {/* Streak */}
        {streak > 0 && (
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-orange-300">{streak}-day streak</span>
            </div>
          </div>
        )}

        {playedData ? (
          /* ── Already played state ── */
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-6 text-center space-y-4 border border-white/10">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Challenge Complete</p>
              <p className="text-5xl font-display font-black text-white">
                {playedData.finalScore.toLocaleString()}
                <span className="text-lg text-muted-foreground font-normal ml-2">pts</span>
              </p>
              <p className="text-lg text-white/70">Rank <span className="text-white font-bold">#{playedData.rank}</span></p>
              <div className="text-3xl tracking-widest py-1">{playedData.emojiGrid}</div>
              <ShareButton text={shareText} />
            </div>

            {/* Leaderboard preview */}
            {playedData.leaderboard.length > 0 && (
              <div className="glass-panel rounded-2xl p-5 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" /> Today&apos;s Leaderboard
                  </p>
                  <Link
                    href={`/daily/${challenge.date.toISOString().slice(0, 10)}/leaderboard`}
                    className="text-xs text-primary hover:underline"
                  >
                    Full leaderboard →
                  </Link>
                </div>
                <ol className="space-y-2">
                  {playedData.leaderboard.map((entry, i) => (
                    <li key={entry.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground w-6 shrink-0">#{i + 1}</span>
                      <span className="font-mono font-bold text-white flex-1">{entry.initials}</span>
                      <span className="text-white/70">{entry.finalScore.toLocaleString()}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Next challenge countdown */}
            <div className="text-center text-sm text-muted-foreground">
              Next challenge in <Countdown initialSeconds={secondsUntilMidnight} />
            </div>
          </div>
        ) : (
          /* ── Not played state ── */
          <div className="text-center space-y-6">
            <p className="text-muted-foreground">
              {challenge.imageIds.length} cars. One chance. How well do you know them?
            </p>
            <Link
              href="/game?daily=true"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-black font-display font-black text-lg rounded-2xl hover:brightness-110 transition-all"
            >
              Play Challenge <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        )}

        {/* Archive link */}
        <div className="mt-12 text-center">
          <Link href="/daily/archive" className="text-sm text-muted-foreground hover:text-white transition-colors">
            Browse past challenges →
          </Link>
        </div>
      </main>
    </div>
  );
}
