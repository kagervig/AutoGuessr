"use client";
// Daily challenge calendar page — monthly history view with per-day result drawer.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar, Lock } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { calcGrade } from "@/app/lib/grade";
import { useDailyChallengeHistory, type CalendarDayData } from "@/app/_hooks/useDailyChallengeHistory";
import { usePlayerId } from "@/app/_hooks/usePlayerId";
import { DailyChallengeDrawer } from "@/app/_components/DailyChallengeDrawer";
import { Navbar } from "@/app/components/layout/Navbar";

const DAILY_MAX_SCORE = 10 * Math.floor(1000 * 1.7);

const GRADE_COLOR: Record<string, string> = {
  S: "#facc15",
  A: "#4ade80",
  B: "#60a5fa",
  C: "#fb923c",
  D: "#6b7280",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// ─── Day cell ───────────────────────────────────────────────────────────────

function DayCell({
  day,
  data,
  isToday,
  onClick,
}: {
  day: number;
  data: CalendarDayData | undefined;
  isToday: boolean;
  onClick: () => void;
}) {
  const isFuture = data?.state === "future" || !data;
  const played = data?.state === "played";
  const gradeColor = played && data.score !== undefined
    ? GRADE_COLOR[calcGrade(data.score / DAILY_MAX_SCORE).grade]
    : undefined;

  return (
    <motion.button
      whileHover={!isFuture ? { scale: 1.04, y: -1 } : {}}
      whileTap={!isFuture ? { scale: 0.97 } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      onClick={!isFuture ? onClick : undefined}
      disabled={isFuture}
      className={cn(
        "relative aspect-square rounded-xl flex flex-col items-center justify-center overflow-hidden text-center transition-colors",
        isFuture && "opacity-20 cursor-not-allowed",
        !isFuture && !played && "cursor-pointer hover:bg-white/5",
        played && "cursor-pointer",
      )}
      style={{
        background: played
          ? `linear-gradient(145deg, ${gradeColor}18 0%, ${gradeColor}08 100%)`
          : isToday
          ? "rgba(245,158,11,0.06)"
          : "rgba(255,255,255,0.02)",
        border: isToday
          ? "1px solid rgba(245,158,11,0.55)"
          : played
          ? `1px solid ${gradeColor}44`
          : "1px solid rgba(255,255,255,0.05)",
        boxShadow: played ? `0 4px 16px ${gradeColor}22, inset 0 1px 0 ${gradeColor}22` : "none",
      }}
    >
      {isToday && (
        <div
          className="absolute inset-x-0 top-0 h-0.5"
          style={{ background: "linear-gradient(90deg, transparent, #f59e0b, transparent)" }}
        />
      )}

      {played && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${gradeColor}25 0%, transparent 65%)` }}
        />
      )}

      {played && data.score !== undefined ? (
        <>
          <div className="text-[10px] font-bold text-white/40 mb-0.5 tabular-nums">{day}</div>
          <div
            className="text-sm font-black leading-none tabular-nums"
            style={{ color: gradeColor, filter: `drop-shadow(0 0 4px ${gradeColor}66)` }}
          >
            {(data.score / 1000).toFixed(0)}k
          </div>
          <div className="text-[9px] text-white/50 font-mono mt-0.5">#{data.rank}</div>
        </>
      ) : (
        <>
          <div className={cn(
            "text-sm font-bold tabular-nums",
            isToday ? "text-amber-300" : "text-white/40",
            isFuture && "text-white/20",
          )}>
            {day}
          </div>
          {isToday && (
            <div className="text-[8px] font-black tracking-widest text-amber-300/70 uppercase mt-0.5">TODAY</div>
          )}
          {isFuture && <Lock className="w-2.5 h-2.5 text-white/20 mt-0.5" />}
        </>
      )}
    </motion.button>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function Page() {
  const now = new Date();
  const router = useRouter();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed
  const [selected, setSelected] = useState<{ dateStr: string; day: number } | null>(null);
  const playerId = usePlayerId();
  const today = now.toISOString().slice(0, 10);

  const { days, error } = useDailyChallengeHistory(viewYear, viewMonth + 1, playerId);
  const dayMap = new Map(days.map((d) => [d.dateStr, d]));

  function prevMonth() {
    setSelected(null);
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    setSelected(null);
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  const canGoNext =
    viewYear < now.getFullYear() ||
    (viewYear === now.getFullYear() && viewMonth < now.getMonth());

  // Build grid cells
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // Stat strip
  const playedDays = days.filter((d) => d.state === "played");
  const playedCount = playedDays.length;
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const passedDays = isCurrentMonth ? now.getDate() : daysInMonth;
  const bestRank = playedDays.length ? Math.min(...playedDays.map((d) => d.rank!)) : null;
  const topScore = playedDays.length ? Math.max(...playedDays.map((d) => d.score!)) : null;

  function handleDayClick(dateStr: string, day: number, data: CalendarDayData | undefined) {
    if (data?.state === "played") {
      setSelected((prev) => prev?.dateStr === dateStr ? null : { dateStr, day });
    } else {
      router.push(`/daily-challenge/${dateStr}`);
    }
  }

  const selectedData = selected ? dayMap.get(selected.dateStr) : null;
  const selectedGrade = selectedData?.score !== undefined
    ? calcGrade(selectedData.score / DAILY_MAX_SCORE)
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 pt-24 pb-12">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-widest uppercase leading-tight">Daily Challenges</h1>
            <div className="text-xs text-muted-foreground tracking-[0.15em]">Your history at a glance</div>
          </div>
        </motion.div>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        {/* Month navigator + stat strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl mb-3 overflow-hidden"
          style={{
            background: "linear-gradient(155deg, #1a1612, #111009)",
            border: "1px solid rgba(245,158,11,0.18)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <div className="h-0.5" style={{ background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.6), transparent)" }} />

          <div className="flex items-center justify-between px-5 py-3.5">
            <button
              onClick={prevMonth}
              aria-label="Previous month"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="font-black text-xl tracking-wider text-white">{MONTHS[viewMonth]}</div>
              <div className="text-[10px] font-mono font-bold text-amber-300/60 tracking-[0.3em]">{viewYear}</div>
            </div>

            <button
              onClick={nextMonth}
              disabled={!canGoNext}
              aria-label="Next month"
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                canGoNext ? "text-white/50 hover:text-white hover:bg-white/10" : "text-white/15 cursor-not-allowed",
              )}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex border-t border-white/5">
            <div className="flex-1 text-center py-2 border-r border-white/5">
              <div className="text-[9px] font-black tracking-[0.2em] text-white/30 uppercase">Played</div>
              <div className="text-sm font-black text-amber-400 tabular-nums">
                {playedCount}<span className="text-white/25 font-normal text-xs">/{passedDays}</span>
              </div>
            </div>
            <div className="flex-1 text-center py-2 border-r border-white/5">
              <div className="text-[9px] font-black tracking-[0.2em] text-white/30 uppercase">Best Rank</div>
              <div className="text-sm font-black text-white tabular-nums">
                {bestRank !== null ? `#${bestRank}` : "—"}
              </div>
            </div>
            <div className="flex-1 text-center py-2">
              <div className="text-[9px] font-black tracking-[0.2em] text-white/30 uppercase">Top Score</div>
              <div className="text-sm font-black text-white tabular-nums">
                {topScore !== null ? `${(topScore / 1000).toFixed(0)}k` : "—"}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Calendar grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl overflow-hidden p-3"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[9px] font-black tracking-widest text-white/25 uppercase py-1.5">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="aspect-square" />;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const data = dayMap.get(dateStr);
              const isTodayCell = dateStr === today;
              return (
                <DayCell
                  key={dateStr}
                  day={day}
                  data={data}
                  isToday={isTodayCell}
                  onClick={() => handleDayClick(dateStr, day, data)}
                />
              );
            })}
          </div>

          {/* Grade legend */}
          <div className="flex items-center gap-4 mt-3 px-1 pt-2 border-t border-white/5 flex-wrap">
            {(["S", "A", "B", "C", "D"] as const).map((g) => (
              <div key={g} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: `${GRADE_COLOR[g]}40`, border: `1px solid ${GRADE_COLOR[g]}60` }} />
                <span className="text-[9px] font-bold text-white/40">Grade {g}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm border border-amber-400/55" />
              <span className="text-[9px] font-bold text-white/40">Today</span>
            </div>
          </div>
        </motion.div>

        {/* Drawer */}
        <AnimatePresence>
          {selected && selectedData?.state === "played" && selectedGrade && (
            <DailyChallengeDrawer
              key={selected.dateStr}
              dateStr={selected.dateStr}
              day={selected.day}
              monthName={MONTHS[viewMonth]}
              score={selectedData.score!}
              rank={selectedData.rank!}
              totalPlayers={selectedData.totalPlayers ?? 1}
              grade={selectedGrade.grade}
              gradeColor={GRADE_COLOR[selectedGrade.grade]}
              playerId={playerId}
              onClose={() => setSelected(null)}
            />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
