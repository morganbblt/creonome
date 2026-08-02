import { describe, expect, it } from "vitest";
import { isNavigationItemActive } from "./navigation-state";

describe("isNavigationItemActive", () => {
  it("matches a route and its nested screens", () => {
    expect(isNavigationItemActive("/projects", "/projects")).toBe(true);
    expect(isNavigationItemActive("/projects/item-1", "/projects")).toBe(true);
  });

  it("does not confuse adjacent routes", () => {
    expect(isNavigationItemActive("/project-settings", "/projects")).toBe(
      false,
    );
  });
});
