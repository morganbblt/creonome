"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@/src/features/icons/icons";

type Theme = "light" | "dark";

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => setTheme(currentTheme()), []);

  function toggleTheme() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("creonome-theme", next);
    setTheme(next);
  }

  const dark = theme === "dark";
  return (
    <button
      className={className}
      type="button"
      aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
      title={`Switch to ${dark ? "light" : "dark"} mode`}
      onClick={toggleTheme}
    >
      {dark ? (
        <SunIcon width={16} height={16} />
      ) : (
        <MoonIcon width={16} height={16} />
      )}
      <span>{dark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
