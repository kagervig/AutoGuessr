// @vitest-environment happy-dom
// Tests for DailyChallengeCalendar and DailyChallengeCalendarDay.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { DailyChallengeCalendar } from "./DailyChallengeCalendar";
import { DailyChallengeCalendarDay } from "./DailyChallengeCalendarDay";
import type { CalendarDayData } from "./DailyChallengeCalendar";

// June 2026: starts Monday, 30 days
const JUNE = { initialYear: 2026, initialMonth: 6 };
const TODAY = "2026-06-08";

function june(day: number): string {
  return `2026-06-${String(day).padStart(2, "0")}`;
}

function unplayedDays(count: number): CalendarDayData[] {
  return Array.from({ length: count }, (_, i) => ({
    dateStr: june(i + 1),
    state: "unplayed" as const,
  }));
}

describe("DailyChallengeCalendar", () => {
  it("renders a cell for every day in the month", () => {
    render(
      <DailyChallengeCalendar {...JUNE} days={unplayedDays(30)} today={TODAY} />
    );
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.queryByText("31")).not.toBeInTheDocument();
  });

  it("highlights today's cell with an aria-label including 'today'", () => {
    render(
      <DailyChallengeCalendar {...JUNE} days={unplayedDays(30)} today={TODAY} />
    );
    expect(screen.getByLabelText(/today/i)).toBeInTheDocument();
  });

  it("shows the month name and year in the header", () => {
    render(
      <DailyChallengeCalendar {...JUNE} days={unplayedDays(30)} today={TODAY} />
    );
    expect(screen.getByText("June 2026")).toBeInTheDocument();
  });

  it("renders score and rank on played cells", () => {
    const days: CalendarDayData[] = [
      { dateStr: june(1), state: "played", score: 5400, rank: 2 },
    ];
    render(<DailyChallengeCalendar {...JUNE} days={days} today={TODAY} />);
    expect(screen.getByText(/#2/)).toBeInTheDocument();
    expect(screen.getByText(/5[,.]?400/)).toBeInTheDocument();
  });

  it("prev/next navigation updates the displayed month", async () => {
    render(
      <DailyChallengeCalendar {...JUNE} days={unplayedDays(30)} today={TODAY} />
    );
    expect(screen.getByText("June 2026")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Previous month"));
    expect(screen.getByText("May 2026")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Next month"));
    await userEvent.click(screen.getByLabelText("Next month"));
    expect(screen.getByText("July 2026")).toBeInTheDocument();
  });
});

describe("DailyChallengeCalendarDay", () => {
  it("future cells do not render as a button", () => {
    render(<DailyChallengeCalendarDay day={15} state="future" isToday={false} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("unplayed cells render as a button", () => {
    render(<DailyChallengeCalendarDay day={5} state="unplayed" isToday={false} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("played cells render as a button with score and rank", () => {
    render(
      <DailyChallengeCalendarDay day={3} state="played" isToday={false} score={4200} rank={5} />
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByText(/#5/)).toBeInTheDocument();
  });

  it("no-challenge cells render nothing interactive", () => {
    const { container } = render(
      <DailyChallengeCalendarDay day={7} state="no-challenge" isToday={false} />
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.firstChild).toBeNull();
  });
});
