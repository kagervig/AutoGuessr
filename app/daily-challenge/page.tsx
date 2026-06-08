// Daily challenge calendar page — shows a monthly grid of challenge history.
import { DailyChallengeCalendar } from "@/app/_components/DailyChallengeCalendar";
import type { CalendarDayData } from "@/app/_components/DailyChallengeCalendar";

const DUMMY_SCORES = [5400, 3200, 4800, 2900, 6100, 4200, 3750];
const DUMMY_RANKS  = [2, 7, 4, 12, 1, 5, 9];

function getDummyDays(year: number, month: number): CalendarDayData[] {
  const todayStr = new Date().toISOString().slice(0, 10);
  const total = new Date(year, month, 0).getDate();

  return Array.from({ length: total }, (_, i) => {
    const day = i + 1;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (dateStr > todayStr) return { dateStr, state: "future" as const };
    if (day % 7 === 0)      return { dateStr, state: "no-challenge" as const };
    if (day % 3 === 0) {
      const idx = (Math.floor(day / 3) - 1) % DUMMY_SCORES.length;
      return { dateStr, state: "played" as const, score: DUMMY_SCORES[idx], rank: DUMMY_RANKS[idx] };
    }
    return { dateStr, state: "unplayed" as const };
  });
}

export default function Page() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.toISOString().slice(0, 10);
  const days = getDummyDays(year, month);

  return (
    <main className="min-h-screen flex flex-col items-center justify-start pt-16 px-4">
      <h1 className="text-2xl font-bold mb-8">Daily Challenges</h1>
      <DailyChallengeCalendar days={days} today={today} />
    </main>
  );
}
