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
const opportunityWorkspace = readFileSync(
  resolve(
    process.cwd(),
    "src/features/opportunities/opportunity-workspace.tsx",
  ),
  "utf8",
);

describe("requested interaction styles", () => {
  it("reveals Today details through the explicit accessible toggle", () => {
    expect(todayStyles).toMatch(/\.detailsToggle\s*\{/);
    expect(todayStyles).toMatch(/\.details\[data-open\]\s*\{/);
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

  it("presents the opportunity placeholder in a genuine 9:16 frame", () => {
    const media = opportunityStyles.match(/\.media\s*\{([^}]+)\}/)?.[1];

    expect(media).toMatch(/aspect-ratio:\s*9\s*\/\s*16/);
    expect(opportunityWorkspace).toContain("VERTICAL PREVIEW · 9:16");
    expect(opportunityWorkspace).not.toContain("CREATOR FOOTAGE · 9:16");
  });
});
