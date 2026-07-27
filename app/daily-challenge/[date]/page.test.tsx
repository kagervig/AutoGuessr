// @vitest-environment happy-dom
// Tests for the /daily-challenge/[date] page.
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

vi.mock("@/app/_components/DailyChallengeScreen", () => ({
  default: ({ date }: { date: string }) => <div>screen:{date}</div>,
}));

import Page from "./page";
import { notFound } from "next/navigation";

describe("/daily-challenge/[date] page", () => {
  beforeEach(() => vi.mocked(notFound).mockClear());

  it("calls notFound for an invalid date format", async () => {
    await Page({ params: Promise.resolve({ date: "not-a-date" }) });
    expect(notFound).toHaveBeenCalled();
  });

  it("calls notFound for a future date", async () => {
    await Page({ params: Promise.resolve({ date: "2099-01-01" }) });
    expect(notFound).toHaveBeenCalled();
  });

  it("does not call notFound and renders game screen for a valid past date", async () => {
    const el = await Page({ params: Promise.resolve({ date: "2020-01-01" }) });
    expect(notFound).not.toHaveBeenCalled();
    render(el);
    expect(screen.getByText("screen:2020-01-01")).toBeInTheDocument();
  });
});
