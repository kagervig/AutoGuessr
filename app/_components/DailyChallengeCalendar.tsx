"use client";
// Monthly calendar grid showing daily challenge status per day.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DailyChallengeCalendarDay } from "./DailyChallengeCalendarDay";
import type { DayState } from "./DailyChallengeCalendarDay";

export interface CalendarDayData {
  dateStr: string;
  state: DayState;
  score?: number;
  rank?: number;
}

interface Props {
  days: CalendarDayData[];
  today: string;
  initialYear?: number;
  initialMonth?: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// Returns 0 for Monday, 6 for Sunday (ISO week order)
function monthStartOffset(year: number, month: number): number {
  return (new Date(year, month - 1, 1).getDay() + 6) % 7;
}

export function DailyChallengeCalendar({ days, today, initialYear, initialMonth }: Props) {
  const now = new Date();
  const router = useRouter();
  const [year, setYear] = useState(initialYear ?? now.getFullYear());
  const [month, setMonth] = useState(initialMonth ?? now.getMonth() + 1);

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  const dayMap = new Map(days.map((d) => [d.dateStr, d]));
  const totalDays = daysInMonth(year, month);
  const leadingEmpty = monthStartOffset(year, month);

  type GridCell = { day: number; dateStr: string; state: DayState; score?: number; rank?: number } | null;

  const cells: GridCell[] = [
    ...Array<null>(leadingEmpty).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => {
      const day = i + 1;
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const data = dayMap.get(dateStr);
      return { day, dateStr, state: data?.state ?? "no-challenge", score: data?.score, rank: data?.rank };
    }),
  ];

  const trailingEmpty = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < trailingEmpty; i++) cells.push(null);

  return (
    <div className="w-full max-w-lg mx-auto select-none">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          aria-label="Previous month"
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">{MONTH_NAMES[month - 1]} {year}</h2>
        <button
          onClick={nextMonth}
          aria-label="Next month"
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((h) => (
          <div key={h} className="text-center text-xs text-neutral-500 py-1">{h}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) =>
          cell === null ? (
            <div key={`empty-${i}`} aria-hidden="true" />
          ) : (
            <DailyChallengeCalendarDay
              key={cell.dateStr}
              day={cell.day}
              state={cell.state}
              isToday={cell.dateStr === today}
              score={cell.score}
              rank={cell.rank}
              onClick={() => router.push(`/daily-challenge/${cell.dateStr}`)}
            />
          )
        )}
      </div>
    </div>
  );
}
