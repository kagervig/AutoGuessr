// @vitest-environment happy-dom
// Tests for the RoundImage card: image rendering, round label, and hardcore panel overlay.
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RoundImage } from "./RoundImage";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
  },
}));

const baseProps = {
  imageUrl: "https://example.com/car.jpg",
  currentIndex: 0,
  isHardcore: false,
  roundState: "answering" as const,
  visiblePanels: [true, true, true, true, true, true, true, true, true],
};

describe("RoundImage", () => {
  describe("image", () => {
    it("renders the car image with the correct src", () => {
      render(<RoundImage {...baseProps} />);
      expect(screen.getByAltText("Identify this car")).toHaveAttribute("src", "https://example.com/car.jpg");
    });
  });

  describe("round label", () => {
    it("shows the round number for non-hardcore mode", () => {
      render(<RoundImage {...baseProps} currentIndex={2} />);
      expect(screen.getByText("Round 3")).toBeInTheDocument();
    });

    it("shows Hardcore label when isHardcore is true", () => {
      render(<RoundImage {...baseProps} isHardcore={true} />);
      expect(screen.getByText("Hardcore")).toBeInTheDocument();
    });

    it("does not show a round number when isHardcore is true", () => {
      render(<RoundImage {...baseProps} isHardcore={true} currentIndex={1} />);
      expect(screen.queryByText("Round 2")).not.toBeInTheDocument();
    });
  });

  describe("hardcore panel overlay", () => {
    it("renders 9 panels when isHardcore and roundState is answering", () => {
      const { container } = render(<RoundImage {...baseProps} isHardcore={true} roundState="answering" />);
      const panels = container.querySelectorAll(".bg-black");
      expect(panels).toHaveLength(9);
    });

    it("does not render the panel overlay when roundState is revealed", () => {
      const { container } = render(<RoundImage {...baseProps} isHardcore={true} roundState="revealed" />);
      const panels = container.querySelectorAll(".bg-black");
      expect(panels).toHaveLength(0);
    });

    it("does not render the panel overlay when isHardcore is false", () => {
      const { container } = render(<RoundImage {...baseProps} isHardcore={false} roundState="answering" />);
      const panels = container.querySelectorAll(".bg-black");
      expect(panels).toHaveLength(0);
    });
  });
});
