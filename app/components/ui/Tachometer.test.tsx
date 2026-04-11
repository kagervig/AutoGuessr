// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Tachometer } from "./Tachometer";

describe("Tachometer", () => {
  describe("game variant", () => {
    it("renders the score inside the gauge", () => {
      render(<Tachometer score={1234} maxScore={5000} variant="game" />);
      expect(screen.getByText((1234).toLocaleString())).toBeInTheDocument();
    });

    it("renders the POINTS label", () => {
      render(<Tachometer score={1234} maxScore={5000} variant="game" />);
      expect(screen.getByText("POINTS")).toBeInTheDocument();
    });
  });

  describe("results variant", () => {
    it("does not render the score inside the gauge", () => {
      render(<Tachometer score={1234} maxScore={5000} variant="results" />);
      expect(screen.queryByText((1234).toLocaleString())).not.toBeInTheDocument();
    });

    it("does not render the POINTS label", () => {
      render(<Tachometer score={1234} maxScore={5000} variant="results" />);
      expect(screen.queryByText("POINTS")).not.toBeInTheDocument();
    });
  });

  it("always renders the AUTOGUESSR label", () => {
    const { rerender } = render(<Tachometer score={500} maxScore={5000} variant="game" />);
    expect(screen.getByText("AUTOGUESSR")).toBeInTheDocument();

    rerender(<Tachometer score={500} maxScore={5000} variant="results" />);
    expect(screen.getByText("AUTOGUESSR")).toBeInTheDocument();
  });

  it("defaults to game variant when no variant is specified", () => {
    render(<Tachometer score={100} maxScore={5000} />);
    expect(screen.getByText("POINTS")).toBeInTheDocument();
  });

  describe("coloured arc and percentage math", () => {
    it("does not render the coloured arc when score is 0", () => {
      const { container } = render(
        <Tachometer score={0} maxScore={5000} instanceId="zero" variant="game" />
      );
      expect(container.querySelector(`path[stroke="url(#arcGradient-zero)"]`)).toBeNull();
    });

    it("renders the coloured arc when score is greater than 0", () => {
      const { container } = render(
        <Tachometer score={2500} maxScore={5000} instanceId="half" variant="game" />
      );
      expect(container.querySelector(`path[stroke="url(#arcGradient-half)"]`)).toBeInTheDocument();
    });

    it("clamps the arc to full when score exceeds maxScore", () => {
      const { container: atMax } = render(
        <Tachometer score={5000} maxScore={5000} instanceId="atmax" variant="game" />
      );
      const { container: overMax } = render(
        <Tachometer score={9999} maxScore={5000} instanceId="overmax" variant="game" />
      );

      const arcAtMax = atMax.querySelector(`path[stroke="url(#arcGradient-atmax)"]`);
      const arcOverMax = overMax.querySelector(`path[stroke="url(#arcGradient-overmax)"]`);

      expect(arcAtMax?.getAttribute("d")).toBe(arcOverMax?.getAttribute("d"));
    });

    it("renders a shorter arc at 25% than at 75%", () => {
      const { container: low } = render(
        <Tachometer score={1250} maxScore={5000} instanceId="low" variant="game" />
      );
      const { container: high } = render(
        <Tachometer score={3750} maxScore={5000} instanceId="high" variant="game" />
      );

      const arcLow = low.querySelector(`path[stroke="url(#arcGradient-low)"]`);
      const arcHigh = high.querySelector(`path[stroke="url(#arcGradient-high)"]`);

      expect(arcLow?.getAttribute("d")).not.toBe(arcHigh?.getAttribute("d"));
    });
  });
});
