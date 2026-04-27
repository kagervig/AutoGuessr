// Archive page — grid of past daily challenges, newest first.
import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/app/lib/prisma";
import { getTodayUTCMidnight } from "@/app/lib/daily-challenge";
import { Navbar } from "@/app/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Daily Challenge Archive — Autoguessr",
  description: "Browse past daily challenges.",
};

const PAGE_SIZE = 24;

function formatDate(date: Date): string {
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function ArchivePage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;
  const today = getTodayUTCMidnight();

  const [challenges, total] = await Promise.all([
    prisma.dailyChallenge.findMany({
      where: { isPublished: true, date: { lt: today } },
      orderBy: { date: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        challengeNumber: true,
        date: true,
        _count: { select: { sessions: { where: { endedAt: { not: null } } } } },
        sessions: {
          where: { endedAt: { not: null }, finalScore: { not: null } },
          orderBy: { finalScore: "desc" },
          take: 1,
          select: { finalScore: true },
        },
      },
    }),
    prisma.dailyChallenge.count({ where: { isPublished: true, date: { lt: today } } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-primary mb-1">Archive</p>
            <h1 className="text-3xl font-display font-black tracking-widest uppercase text-white">
              Daily Challenges
            </h1>
          </div>
          <Link href="/daily" className="text-sm text-muted-foreground hover:text-white transition-colors">
            ← Today&apos;s Challenge
          </Link>
        </div>

        {challenges.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">No past challenges yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-10">
              {challenges.map((c) => {
                const dateStr = c.date.toISOString().slice(0, 10);
                return (
                  <Link
                    key={c.challengeNumber}
                    href={`/daily/${dateStr}`}
                    className="group rounded-2xl overflow-hidden border border-white/10 hover:border-primary/40 bg-zinc-900 transition-all duration-200 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary">#{c.challengeNumber}</span>
                      <Calendar className="w-3.5 h-3.5 text-white/30 group-hover:text-white/50 transition-colors" />
                    </div>
                    <p className="text-[11px] text-white/40 uppercase tracking-widest">{formatDate(c.date)}</p>
                    <div className="text-xs text-white/50 space-y-0.5">
                      <p>{c._count.sessions} player{c._count.sessions !== 1 ? "s" : ""}</p>
                      {c.sessions[0] && (
                        <p>Top: {c.sessions[0].finalScore?.toLocaleString()}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 text-sm">
                {page > 1 ? (
                  <Link href={`/daily/archive?page=${page - 1}`} className="flex items-center gap-1 text-muted-foreground hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </Link>
                ) : (
                  <span className="flex items-center gap-1 text-white/20"><ChevronLeft className="w-4 h-4" /> Previous</span>
                )}
                <span className="text-muted-foreground">{page} / {totalPages}</span>
                {page < totalPages ? (
                  <Link href={`/daily/archive?page=${page + 1}`} className="flex items-center gap-1 text-muted-foreground hover:text-white transition-colors">
                    Next <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="flex items-center gap-1 text-white/20">Next <ChevronRight className="w-4 h-4" /></span>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
