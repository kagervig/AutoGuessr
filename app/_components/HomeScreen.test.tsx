// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import HomeScreen from "./HomeScreen";
import { MODES } from "@/app/lib/constants";
import { FEATURE_FLAGS, type FeatureFlagMap } from "@/app/lib/feature-flags";

const ALL_ENABLED: FeatureFlagMap = Object.fromEntries(
  FEATURE_FLAGS.map((f) => [f.key, true])
) as FeatureFlagMap;

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
    render(<HomeScreen flags={ALL_ENABLED} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("renders the Community card", () => {
    render(<HomeScreen flags={ALL_ENABLED} />);

    expect(screen.getByText("Community")).toBeInTheDocument();
  });
});
