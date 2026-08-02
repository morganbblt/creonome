import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AppLoading from "./loading";

describe("authenticated route loading", () => {
  it("shows a top progress bar while a navigation is pending", () => {
    render(<AppLoading />);

    expect(
      screen.getByRole("progressbar", { name: /loading page/i }),
    ).toBeTruthy();
  });
});
