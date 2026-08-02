import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const todayStyles = readFileSync(
  resolve(process.cwd(), "app/(app)/today/today.module.css"),
  "utf8",
);
const opportunityStyles = readFileSync(
  resolve(
    process.cwd(),
    "src/features/opportunities/opportunity-workspace.module.css",
  ),
  "utf8",
);

describe("requested interaction styles", () => {
  it("reveals Today details after a deliberate 0.75 second hover delay", () => {
    expect(todayStyles).toMatch(/\.details[\s\S]*transition-delay:\s*0\.75s/);
  });

  it("keeps the page sharp behind a lightly translucent glass side sheet", () => {
    const overlay = opportunityStyles.match(
      /\.modifyOverlay\s*\{([^}]+)\}/,
    )?.[1];
    const sheet = opportunityStyles.match(/\.sheet\s*\{([^}]+)\}/)?.[1];

    expect(overlay).toMatch(/backdrop-filter:\s*none/);
    expect(sheet).toMatch(/background:\s*color-mix/);
    expect(sheet).toMatch(/backdrop-filter:\s*blur\(18px\)/);
  });
});
