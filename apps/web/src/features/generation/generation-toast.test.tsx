import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GenerationToast } from "./generation-toast";

describe("GenerationToast", () => {
  it("lets pointer input pass through the toast surface except for dismiss", () => {
    render(
      <GenerationToast
        state="success"
        title="Video ready"
        detail="The simulated render is saved in this project."
        onDismiss={() => {}}
      />,
    );

    expect(screen.getByRole("status").className).toMatch(/pointer-events-none/);
    expect(
      screen.getByRole("button", { name: "Dismiss" }).className,
    ).toMatch(/pointer-events-auto/);
  });

  it("shows non-blocking progress and its reserved credit amount", () => {
    render(
      <GenerationToast
        state="pending"
        title="Building the storyboard"
        detail="Structuring scenes and edit notes."
        creditLabel="4 credits held"
      />,
    );

    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByRole("progressbar")).toBeTruthy();
    expect(screen.getByText("4 credits held")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("can dismiss a completed generation", () => {
    const dismiss = vi.fn();
    render(
      <GenerationToast
        state="success"
        title="Video ready"
        detail="The simulated render is saved in this project."
        onDismiss={dismiss}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(dismiss).toHaveBeenCalledOnce();
  });
});
