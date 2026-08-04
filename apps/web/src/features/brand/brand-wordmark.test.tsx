import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandWordmark } from "./brand-wordmark";

describe("BrandWordmark", () => {
  it("renders the Creonome mark as an accessible inline graphic", () => {
    render(<BrandWordmark />);

    const logo = screen.getByRole("img", { name: "Creonome" });
    expect(logo.tagName).toBe("svg");
    expect(logo.getAttribute("viewBox")).toBe("0 0 1398 302");
  });
});
