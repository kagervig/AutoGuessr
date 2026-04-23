// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import StandardModeInput from "./StandardModeInput";

const MAKES = ["Toyota", "Honda", "Mazda"];
const MODELS = ["Supra", "Corolla", "Camry"];

beforeEach(() => {
  vi.spyOn(global, "fetch").mockResolvedValue({
    json: () => Promise.resolve({ models: MODELS }),
  } as Response);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function selectMake(make: string) {
  const input = screen.getByPlaceholderText("Make (e.g. Ferrari)");
  await userEvent.clear(input);
  await userEvent.click(input);
  await userEvent.click(screen.getByRole("option", { name: make }));
}

async function selectModel(model: string) {
  await userEvent.click(await screen.findByPlaceholderText("Model"));
  await userEvent.click(screen.getByRole("option", { name: model }));
}

describe("StandardModeInput", () => {
  it("populates the model dropdown with the fetched models", async () => {
    render(<StandardModeInput makes={MAKES} disabled={false} onSubmit={vi.fn()} />);

    await selectMake("Toyota");
    await userEvent.click(await screen.findByPlaceholderText("Model"));

    expect(screen.getByRole("option", { name: "Supra" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Corolla" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Camry" })).toBeInTheDocument();
  });

  it("calls onSubmit with the correct make, model, and year", async () => {
    const onSubmit = vi.fn();
    render(<StandardModeInput makes={MAKES} disabled={false} onSubmit={onSubmit} />);

    await selectMake("Toyota");
    await selectModel("Supra");
    await userEvent.type(screen.getByPlaceholderText("Year (e.g. 1969)"), "1994");
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledWith("Toyota", "Supra", "1994");
  });

  it("clears the model selection when the make changes", async () => {
    render(<StandardModeInput makes={MAKES} disabled={false} onSubmit={vi.fn()} />);

    await selectMake("Toyota");
    await selectModel("Supra");

    // Change make — model should reset
    await selectMake("Honda");

    expect(screen.queryByDisplayValue("Supra")).not.toBeInTheDocument();
  });

  describe("disabled prop", () => {
    it("disables the make input", () => {
      render(<StandardModeInput makes={MAKES} disabled={true} onSubmit={vi.fn()} />);
      expect(screen.getByPlaceholderText("Make (e.g. Ferrari)")).toBeDisabled();
    });

    it("disables the year input", () => {
      render(<StandardModeInput makes={MAKES} disabled={true} onSubmit={vi.fn()} />);
      expect(screen.getByPlaceholderText("Year (e.g. 1969)")).toBeDisabled();
    });

    it("disables the submit button", () => {
      render(<StandardModeInput makes={MAKES} disabled={true} onSubmit={vi.fn()} />);
      expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    });
  });

  it("pressing Tab on the make input accepts the first autocomplete suggestion", async () => {
    render(<StandardModeInput makes={MAKES} disabled={false} onSubmit={vi.fn()} />);

    const makeInput = screen.getByPlaceholderText("Make (e.g. Ferrari)");
    await userEvent.click(makeInput);
    await userEvent.type(makeInput, "Toy");
    await userEvent.tab();

    expect(makeInput).toHaveValue("Toyota");
  });

  it("pressing Enter on the year input submits the answer", async () => {
    const onSubmit = vi.fn();
    render(<StandardModeInput makes={MAKES} disabled={false} onSubmit={onSubmit} />);

    await selectMake("Toyota");
    await selectModel("Supra");
    await userEvent.type(screen.getByPlaceholderText("Year (e.g. 1969)"), "1994");
    await userEvent.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalledWith("Toyota", "Supra", "1994");
  });

  it("keeps the submit button disabled until make, model, and year are all filled", async () => {
    render(<StandardModeInput makes={MAKES} disabled={false} onSubmit={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();

    await selectMake("Toyota");
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();

    await selectModel("Supra");
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText("Year (e.g. 1969)"), "1994");
    expect(screen.getByRole("button", { name: "Submit" })).not.toBeDisabled();
  });
});
