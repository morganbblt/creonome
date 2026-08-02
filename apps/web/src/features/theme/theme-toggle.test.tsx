import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./theme-toggle";

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    },
  });
});

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
});

describe("ThemeToggle", () => {
  it("switches to dark mode and persists the choice", () => {
    document.documentElement.dataset.theme = "light";
    render(<ThemeToggle className="theme" />);

    fireEvent.click(screen.getByRole("button", { name: /dark mode/i }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("creonome-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: /light mode/i })).toBeTruthy();
  });
});
