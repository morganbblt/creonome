import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthShell } from "./auth-shell";

describe("AuthShell", () => {
  it("frames Neon Auth in the Creonome product language", () => {
    render(
      <AuthShell>
        <div>Auth form</div>
      </AuthShell>,
    );

    expect(screen.getByRole("img", { name: "Creonome" })).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: "Make the next idea feel like yours.",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Auth form")).toBeTruthy();
    expect(
      screen.getByText("Build to create a lot of vertical video content"),
    ).toBeTruthy();
    expect(
      screen.queryByText("Built for independent music creators."),
    ).toBeNull();
    expect(
      screen.getByRole("link", { name: "Privacy" }).getAttribute("href"),
    ).toBe("/legal/privacy");
  });
});
