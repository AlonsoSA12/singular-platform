"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "singular-platform-theme";

function applyTheme(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    const resolvedTheme =
      storedTheme === "dark" || storedTheme === "light"
        ? storedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    setTheme(resolvedTheme);
    applyTheme(resolvedTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <button className="secondary-button" onClick={toggleTheme} type="button">
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
