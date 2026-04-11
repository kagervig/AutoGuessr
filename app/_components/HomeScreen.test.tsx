// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import HomeScreen from "./HomeScreen";
import { MODES } from "@/app/lib/constants";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("next/script", () => ({
  default: () => null,
}));

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({}),
  } as Response);
});

describe("HomeScreen", () => {
  it.each([...MODES])("renders the $label mode card", ({ label }) => {
    render(<HomeScreen />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("renders the Community card", () => {
    render(<HomeScreen />);

    expect(screen.getByText("Community")).toBeInTheDocument();
  });
});
