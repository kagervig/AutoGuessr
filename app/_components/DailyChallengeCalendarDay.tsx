"use client";
// Individual day cell for the daily challenge calendar grid.
import { cn } from "@/app/lib/utils";

export type DayState = "future" | "no-challenge" | "unplayed" | "played";

interface Props {
  day: number;
  state: DayState;
  isToday: boolean;
  score?: number;
  rank?: number;
  onClick?: () => void;
}

export function DailyChallengeCalendarDay({ day, state, isToday, score, rank, onClick }: Props) {
  if (state === "no-challenge") {
    return null;
  }

  if (state === "future") {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg p-1 text-sm text-neutral-500 select-none">
        <span>{day}</span>
      </div>
    );
  }

  const label = `${day}${isToday ? ", today" : ""}${state === "played" && score !== undefined ? `, score ${score}` : ""}`;

  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg p-1 text-sm transition-colors w-full",
        isToday && "ring-2 ring-white font-bold",
        state === "unplayed" && "hover:bg-white/10",
        state === "played" && "bg-white/10 hover:bg-white/20",
      )}
    >
      <span>{day}</span>
      {state === "played" && score !== undefined && rank !== undefined && (
        <span className="text-xs text-neutral-400">#{rank} · {score.toLocaleString()}</span>
      )}
    </button>
  );
}
