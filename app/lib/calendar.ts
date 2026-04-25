// Calendar helpers: month grid and pathname parsing.

export type DayCell = {
  date: Date;
  isInMonth: boolean;
  isFuture: boolean;
  isToday: boolean;
};

export function buildMonthGrid(year: number, month: number, today: Date): DayCell[] {
  const cells: DayCell[] = [];

  // Start date: first day of the month
  const monthStart = new Date(Date.UTC(year, month, 1));

  // Find the first Sunday on or before the 1st
  const startDate = new Date(monthStart);
  startDate.setUTCDate(startDate.getUTCDate() - monthStart.getUTCDay());

  // Generate 42 cells (6 weeks × 7 days)
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(startDate);
    cellDate.setUTCDate(cellDate.getUTCDate() + i);

    const isInMonth = cellDate.getUTCMonth() === month && cellDate.getUTCFullYear() === year;
    const isFuture = cellDate > today;

    cells.push({
      date: cellDate,
      isInMonth,
      isFuture,
      isToday: cellDate.getTime() === today.getTime(),
    });
  }

  return cells;
}

export function parseMonthSlug(slug: string, today: Date, origin: Date): { year: number; month: number } | null {
  const match = slug.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // Convert to 0-indexed

  // Validate
  if (month < 0 || month > 11) return null;

  const parsed = new Date(Date.UTC(year, month, 1));
  const todayMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const originMonth = new Date(Date.UTC(origin.getUTCFullYear(), origin.getUTCMonth(), 1));

  // Clamp to [origin, today]
  if (parsed < originMonth || parsed > todayMonth) {
    return null;
  }

  return { year, month };
}

export function monthToSlug(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function getAdjacentMonths(
  year: number,
  month: number,
  origin: Date,
  today: Date
): { prev: { year: number; month: number } | null; next: { year: number; month: number } | null } {
  const originYear = origin.getUTCFullYear();
  const originMonth = origin.getUTCMonth();
  const todayYear = today.getUTCFullYear();
  const todayMonth = today.getUTCMonth();

  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth < 0) {
    prevMonth = 11;
    prevYear -= 1;
  }

  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear += 1;
  }

  // Check bounds
  const prevValid =
    prevYear > originYear || (prevYear === originYear && prevMonth >= originMonth);
  const nextValid = nextYear < todayYear || (nextYear === todayYear && nextMonth <= todayMonth);

  return {
    prev: prevValid ? { year: prevYear, month: prevMonth } : null,
    next: nextValid ? { year: nextYear, month: nextMonth } : null,
  };
}
