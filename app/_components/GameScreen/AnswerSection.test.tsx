// @vitest-environment happy-dom
// Tests for AnswerSection: mode-based conditional rendering and user interactions.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnswerSection } from "./AnswerSection";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
    button: ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...rest}>{children}</button>,
  },
}));

// Mock fetch to silence network calls made by StandardModeInput/CustomModeInput.
vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ models: [] }) })));

const choices = [
  { vehicleId: "v1", label: "Toyota Supra" },
  { vehicleId: "v2", label: "Honda NSX" },
  { vehicleId: "v3", label: "Nissan GT-R" },
  { vehicleId: "v4", label: "Mazda RX-7" },
];

const baseProps = {
  mode: "easy",
  currentIndex: 0,
  roundState: "answering" as const,
  choices,
  selectedEasyId: null,
  isSubmitting: false,
  makes: ["Toyota", "Honda"],
  mediumYearGuessing: false,
  onEasyAnswer: vi.fn(),
  onMediumSubmit: vi.fn(),
  onHardSubmit: vi.fn(),
  onGiveUp: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AnswerSection", () => {
  describe("visibility", () => {
    it("renders the answer panel when roundState is answering", () => {
      render(<AnswerSection {...baseProps} />);
      expect(screen.getByText("Give Up")).toBeInTheDocument();
    });

    it("does not render when roundState is revealed", () => {
      render(<AnswerSection {...baseProps} roundState="revealed" />);
      expect(screen.queryByText("Give Up")).not.toBeInTheDocument();
    });
  });

  describe("choice grid", () => {
    it("renders a button for each choice in easy mode", () => {
      render(<AnswerSection {...baseProps} mode="easy" />);
      expect(screen.getByText("Toyota Supra")).toBeInTheDocument();
      expect(screen.getByText("Honda NSX")).toBeInTheDocument();
      expect(screen.getByText("Nissan GT-R")).toBeInTheDocument();
      expect(screen.getByText("Mazda RX-7")).toBeInTheDocument();
    });

    it("renders the choice grid in practice mode", () => {
      render(<AnswerSection {...baseProps} mode="practice" />);
      expect(screen.getByText("Toyota Supra")).toBeInTheDocument();
    });

    it("renders the choice grid in custom mode", () => {
      render(<AnswerSection {...baseProps} mode="custom" />);
      expect(screen.getByText("Toyota Supra")).toBeInTheDocument();
    });

    it("calls onEasyAnswer with the vehicleId when a choice is clicked", async () => {
      const onEasyAnswer = vi.fn();
      render(<AnswerSection {...baseProps} onEasyAnswer={onEasyAnswer} />);
      await userEvent.click(screen.getByText("Toyota Supra"));
      expect(onEasyAnswer).toHaveBeenCalledWith("v1");
    });

    it("disables all choices once one is selected", () => {
      render(<AnswerSection {...baseProps} selectedEasyId="v1" />);
      const buttons = screen.getAllByRole("button", { name: /Toyota Supra|Honda NSX|Nissan GT-R|Mazda RX-7/ });
      buttons.forEach((btn) => expect(btn).toBeDisabled());
    });
  });

  describe("hard mode input", () => {
    it("renders the Submit button for standard mode", () => {
      render(<AnswerSection {...baseProps} mode="standard" />);
      expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
    });

    it("renders the Submit button for hardcore mode", () => {
      render(<AnswerSection {...baseProps} mode="hardcore" />);
      expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
    });

    it("renders the Submit button for time_attack mode", () => {
      render(<AnswerSection {...baseProps} mode="time_attack" />);
      expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
    });
  });

  describe("custom mode input", () => {
    it("renders the Confirm button for custom mode", () => {
      render(<AnswerSection {...baseProps} mode="custom" />);
      expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
    });
  });

  describe("Give Up button", () => {
    it("renders a Give Up button", () => {
      render(<AnswerSection {...baseProps} />);
      expect(screen.getByRole("button", { name: /give up/i })).toBeInTheDocument();
    });

    it("calls onGiveUp when Give Up is clicked", async () => {
      const onGiveUp = vi.fn();
      render(<AnswerSection {...baseProps} onGiveUp={onGiveUp} />);
      await userEvent.click(screen.getByRole("button", { name: /give up/i }));
      expect(onGiveUp).toHaveBeenCalledOnce();
    });
  });
});
