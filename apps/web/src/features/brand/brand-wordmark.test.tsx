import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandWordmark } from "./brand-wordmark";

describe("BrandWordmark", () => {
  it("uses the supplied Creonome wordmark asset", () => {
    render(<BrandWordmark />);

    const logo = screen.getByRole("img", { name: "Creonome" });
    expect(logo.getAttribute("src")).toBe("/brand/creonome-wordmark-black.svg");
    expect(logo.getAttribute("width")).toBe("1398");
    expect(logo.getAttribute("height")).toBe("302");
  });
});
