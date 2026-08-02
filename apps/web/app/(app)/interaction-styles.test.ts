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
  it("reveals Today details after a deliberate 1.5 second hover delay", () => {
    expect(todayStyles).toMatch(/\.details[\s\S]*transition-delay:\s*1\.5s/);
  });

  it("keeps the side sheet opaque while softening the page behind it", () => {
    const overlay = opportunityStyles.match(/\.overlay\s*\{([^}]+)\}/)?.[1];
    const sheet = opportunityStyles.match(/\.sheet\s*\{([^}]+)\}/)?.[1];

    expect(overlay).toMatch(/backdrop-filter:\s*blur\(8px\)/);
    expect(sheet).toMatch(/background:\s*var\(--surface\)/);
    expect(sheet).not.toMatch(/color-mix/);
  });
});
