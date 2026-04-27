// Archive daily challenge page — play a past challenge or view its leaderboard.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Calendar, ArrowRight, Trophy } from "lucide-react";
import { prisma } from "@/app/lib/prisma";
import { getTodayUTCMidnight } from "@/app/lib/daily-challenge";
import { Navbar } from "@/app/components/layout/Navbar";

function formatDate(date: Date): string {
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

interface Props {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  return { title: `Daily Challenge ${date} — Autoguessr` };
}

export default async function ArchiveDailyPage({ params }: Props) {
  const { date: dateStr } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) notFound();

  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (isNaN(date.getTime())) notFound();

  // If this is today's date, send the user to the canonical daily page
  if (date.getTime() === getTodayUTCMidnight().getTime()) {
    redirect("/daily");
  }

  const challenge = await prisma.dailyChallenge.findUnique({
    where: { date },
    select: {
      id: true,
      challengeNumber: true,
      date: true,
      isPublished: true,
      imageIds: true,
      sessions: {
        where: { endedAt: { not: null }, finalScore: { not: null, gt: 0 }, initials: { not: null } },
        orderBy: { finalScore: "desc" },
        take: 5,
        select: { id: true, initials: true, finalScore: true },
      },
      _count: { select: { sessions: { where: { endedAt: { not: null } } } } },
    },
  });

  if (!challenge || !challenge.isPublished) notFound();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 pt-32 pb-20">

        {/* Header */}
        <div className="mb-2">
          <Link href="/daily/archive" className="text-xs text-muted-foreground hover:text-white transition-colors">
            ← Archive
          </Link>
        </div>
        <div className="text-center mb-10">
          <p className="text-xs font-bold tracking-widest uppercase text-primary mb-2">Archive</p>
          <h1 className="text-4xl sm:text-5xl font-display font-black tracking-widest uppercase text-white mb-2">
            #{challenge.challengeNumber}
          </h1>
          <p className="text-muted-foreground text-sm flex items-center justify-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(challenge.date)}
          </p>
          <p className="mt-2 text-xs text-white/40">{challenge._count.sessions} player{challenge._count.sessions !== 1 ? "s" : ""} completed this challenge</p>
        </div>

        {/* Archive notice */}
        <div className="mb-8 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
          <p className="text-xs text-amber-300">Archive replay — your score won&apos;t count on the original leaderboard.</p>
        </div>

        {/* Play button */}
        <div className="text-center mb-10">
          <Link
            href={`/game?daily=true&dailyDate=${dateStr}`}
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-black font-display font-black text-lg rounded-2xl hover:brightness-110 transition-all"
          >
            Play Archive Challenge <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Leaderboard preview */}
        {challenge.sessions.length > 0 && (
          <div className="glass-panel rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" /> Top Scores
              </p>
              <Link
                href={`/daily/${dateStr}/leaderboard`}
                className="text-xs text-primary hover:underline"
              >
                Full leaderboard →
              </Link>
            </div>
            <ol className="space-y-2">
              {challenge.sessions.map((entry, i) => (
                <li key={entry.id} className="flex items-center text-sm gap-3">
                  <span className="text-muted-foreground w-6 shrink-0">#{i + 1}</span>
                  <span className="font-mono font-bold text-white flex-1">{entry.initials}</span>
                  <span className="text-white/70">{entry.finalScore!.toLocaleString()}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </main>
    </div>
  );
}
