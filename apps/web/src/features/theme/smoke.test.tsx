import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

describe("smoke", () => {
  it("axe catches a real violation", async () => {
    const { container } = render(
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/x.png" />,
    );
    const results = await axe(container);
    expect(results.violations.length).toBeGreaterThan(0);
  });
});
