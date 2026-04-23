"use client";

// Car of the Day card — collapsed teaser and expanded full trivia view.
import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  CalendarDays,
  Compass,
  Cog,
  Globe,
  Zap,
  Trophy,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { DAILY_DISCOVERY_BONUS } from "@/app/lib/constants";

interface TriviaData {
  productionYears: string;
  engine: string | null;
  layout: string | null;
  regionalNames: string | null;
  funFacts: string[];
}

export interface CarOfTheDayData {
  date: string;
  vehicle: { id: string; make: string; model: string; displayModel: string | null };
  image: { id: string; filename: string; url: string };
  trivia: TriviaData | null;
}

interface Props {
  data: CarOfTheDayData;
  isFound: boolean;
}

function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split("-").map(Number);
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${months[month - 1]} ${day}`;
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  return (
    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-orange-400">{icon}</span>
        <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase">{label}</span>
      </div>
      <p className="text-sm text-white font-mono">{value ?? "—"}</p>
    </div>
  );
}

export function CarOfTheDayCard({ data, isFound }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [prefersReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const displayModel = data.vehicle.displayModel ?? data.vehicle.model;
  const dateLabel = formatDate(data.date);

  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 300, damping: 30 };

  return (
    <motion.article
      layout={!prefersReducedMotion}
      className="w-[70%] mx-auto rounded-3xl border border-orange-500/30 bg-gradient-to-br from-zinc-900 to-black overflow-hidden shadow-[0_0_40px_rgba(249,115,22,0.08)]"
    >
      {/* Collapsed row */}
      <button
        className="w-full flex items-center gap-4 p-4 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={`Car of the Day: ${data.vehicle.make} ${displayModel}. ${expanded ? "Collapse" : "Expand"} details.`}
      >
        {/* Thumbnail */}
        <div className="relative w-20 h-16 rounded-xl overflow-hidden shrink-0 bg-zinc-800">
          <Image
            src={data.image.url}
            alt={`Today's featured vehicle: ${data.vehicle.make} ${displayModel}`}
            fill
            className="object-cover"
            sizes="80px"
          />
        </div>

        {/* Middle info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="text-xs font-bold tracking-widest text-orange-400 uppercase">Car of the Day</span>
            <span className="text-xs text-white/30 tracking-widest uppercase">· {dateLabel}</span>
          </div>
          <p className="text-xs font-bold tracking-widest text-white/40 uppercase">{data.vehicle.make}</p>
          <p className="text-2xl font-display font-black italic text-white truncate leading-tight">{displayModel}</p>
        </div>

        {/* Right: bonus / found + expand toggle */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {isFound ? (
            <span className="text-base font-bold text-green-400 tracking-wide">FOUND ✓</span>
          ) : (
            <span className="text-2xl font-black text-orange-400">+{DAILY_DISCOVERY_BONUS.toLocaleString()}</span>
          )}
          <span className="flex items-center gap-1 text-xs text-white/40 uppercase tracking-wider">
            STATS <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", expanded && "rotate-180")} />
          </span>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded"
            initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
            transition={transition}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Hero image */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-zinc-800">
                <Image
                  src={data.image.url}
                  alt={`${data.vehicle.make} ${displayModel}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 70vw, 640px"
                />
              </div>

              {/* Stats grid */}
              {data.trivia && (
                <>
                  <dl className="grid grid-cols-2 gap-3">
                    <StatCard
                      icon={<CalendarDays className="w-3 h-3" />}
                      label="Years"
                      value={data.trivia.productionYears}
                    />
                    <StatCard
                      icon={<Compass className="w-3 h-3" />}
                      label="Layout"
                      value={data.trivia.layout}
                    />
                  </dl>

                  <StatCard
                    icon={<Cog className="w-3 h-3" />}
                    label="Engine"
                    value={data.trivia.engine}
                  />

                  {data.trivia.regionalNames && (
                    <StatCard
                      icon={<Globe className="w-3 h-3" />}
                      label="Regional"
                      value={data.trivia.regionalNames}
                    />
                  )}

                  {data.trivia.funFacts.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-3 h-3 text-orange-400" />
                        <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase">Trivia</span>
                        <div className="flex-1 h-px bg-white/10" />
                      </div>
                      <ul className="space-y-2">
                        {data.trivia.funFacts.map((fact, i) => (
                          <li key={i} className="flex gap-3 text-sm text-white/80">
                            <span className="text-orange-400 font-bold shrink-0">•</span>
                            {fact}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {/* Bonus CTA */}
              <footer className={cn(
                "flex items-center gap-3 rounded-2xl border p-4",
                isFound
                  ? "border-green-500/30 bg-green-500/10"
                  : "border-orange-500/30 bg-orange-500/10"
              )}>
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  isFound ? "bg-green-500/20" : "bg-orange-500/20"
                )}>
                  {isFound
                    ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                    : <Trophy className="w-5 h-5 text-orange-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  {isFound ? (
                    <>
                      <p className="text-sm font-bold text-green-400">Daily Discovery claimed</p>
                      <p className="text-xs text-white/50">+{DAILY_DISCOVERY_BONUS.toLocaleString()} banked</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-white">Daily Discovery</p>
                      <p className="text-xs text-white/50">Identify this car in any round to bank a bonus.</p>
                    </>
                  )}
                </div>
                {!isFound && (
                  <span className="text-xl font-black text-orange-400">+{DAILY_DISCOVERY_BONUS.toLocaleString()}</span>
                )}
              </footer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
