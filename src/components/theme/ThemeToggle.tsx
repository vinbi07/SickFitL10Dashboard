"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "sickfit-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("theme-light", "theme-dark");
  root.classList.add(theme === "dark" ? "theme-dark" : "theme-light");
  root.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function handleChange(nextTheme: Theme) {
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  }

  return (
    <div className="fixed right-4 top-4 z-50 rounded-full border border-app-border bg-app-panel/95 p-1 shadow-lg backdrop-blur md:right-6 md:top-6">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => handleChange("light")}
          aria-label="Switch to light mode"
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            theme === "light"
              ? "bg-brand text-white"
              : "text-app-muted hover:text-foreground"
          }`}
        >
          Light
        </button>
        <button
          type="button"
          onClick={() => handleChange("dark")}
          aria-label="Switch to dark mode"
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            theme === "dark"
              ? "bg-brand text-white"
              : "text-app-muted hover:text-foreground"
          }`}
        >
          Dark
        </button>
      </div>
    </div>
  );
}
