// Archive page — grid of past Cars of the Day, newest first.
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";
import { getTodayUTCMidnight } from "@/app/lib/car-of-the-day";
import { Navbar } from "@/app/components/layout/Navbar";
import { cn } from "@/app/lib/utils";

export const metadata: Metadata = {
  title: "Car of the Day Archive — Autoguessr",
  description: "Browse past featured vehicles.",
};

function formatDate(date: Date): string {
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

export default async function ArchivePage() {
  const today = getTodayUTCMidnight();

  const entries = await prisma.featuredVehicleOfDay.findMany({
    where: { date: { lt: today } },
    orderBy: { date: "desc" },
    take: 60,
    include: {
      vehicle: { select: { id: true, make: true, model: true, trivia: { select: { displayModel: true } } } },
      image: { select: { id: true, filename: true } },
    },
  });

  const cookieStore = await cookies();
  const foundDatesRaw = cookieStore.get("cotd_found_dates")?.value;
  let foundDates: Set<string> = new Set();
  if (foundDatesRaw) {
    try {
      const parsed: string[] = JSON.parse(decodeURIComponent(foundDatesRaw));
      foundDates = new Set(parsed);
    } catch {
      // Malformed cookie — treat all as not found
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="flex items-center gap-3 mb-10">
          <Sparkles className="w-6 h-6 text-orange-400" />
          <h1 className="text-3xl font-display font-black tracking-widest uppercase text-white">
            Car of the Day Archive
          </h1>
        </div>

        {entries.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">
            No past Cars of the Day yet. Check back tomorrow!
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {entries.map((entry) => {
              const dateStr = entry.date.toISOString().slice(0, 10);
              const isFound = foundDates.has(dateStr);
              const displayModel = entry.vehicle.trivia?.displayModel ?? entry.vehicle.model;
              const url = imageUrl(entry.image.filename, entry.vehicle.id);

              return (
                <Link
                  key={entry.date.toISOString()}
                  href={`/car-of-the-day/archive/${dateStr}`}
                  className={cn(
                    "group relative rounded-2xl overflow-hidden border transition-all duration-200",
                    "border-white/10 hover:border-orange-500/40 bg-zinc-900",
                  )}
                >
                  <div className="relative aspect-[4/3] bg-zinc-800">
                    <Image
                      src={url}
                      alt={`${entry.vehicle.make} ${displayModel}`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    />
                    {isFound && (
                      <div className="absolute top-2 right-2 bg-green-500/90 rounded-full p-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">
                      {formatDate(entry.date)}
                    </p>
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-wide">
                      {entry.vehicle.make}
                    </p>
                    <p className="text-sm font-display font-black italic text-white leading-tight truncate">
                      {displayModel}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
