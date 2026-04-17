"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "singular-platform-theme";

function applyTheme(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const isDark = theme === "dark";

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    const resolvedTheme =
      storedTheme === "dark" || storedTheme === "light"
        ? storedTheme
        : "dark";

    setTheme(resolvedTheme);
    applyTheme(resolvedTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <div className="user-menu-row">
      <div className="user-menu-row-label">
        <span aria-hidden="true" className="user-menu-row-icon">
          <svg viewBox="0 0 24 24">
            <path d="M12 3a1 1 0 0 1 1 1v1.2a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm0 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2a7 7 0 1 1 0-14 7 7 0 0 1 0 14Zm8-8a1 1 0 0 1 1 1 1 1 0 0 1-1 1h-1.2a1 1 0 1 1 0-2Zm-14.8 0a1 1 0 1 1 0 2H4a1 1 0 1 1 0-2Zm10.22-5.81a1 1 0 0 1 1.42 0l.84.84a1 1 0 0 1-1.42 1.42l-.84-.84a1 1 0 0 1 0-1.42Zm-8.1 8.1a1 1 0 0 1 1.42 0l.84.84a1 1 0 0 1-1.42 1.42l-.84-.84a1 1 0 0 1 0-1.42Zm9.36 2.26a1 1 0 0 1 1.42 1.42l-.84.84a1 1 0 1 1-1.42-1.42Zm-8.52-8.52a1 1 0 0 1 1.42 1.42l-.84.84A1 1 0 0 1 7.32 8.4Z" />
          </svg>
        </span>
        <span className="user-menu-row-copy">
          <strong>Tema</strong>
          <small>{isDark ? "Night mode" : "Light mode"}</small>
        </span>
      </div>

      <button
        aria-checked={isDark}
        aria-label="Cambiar tema"
        className={`theme-switch ${isDark ? "is-dark" : "is-light"}`}
        onClick={toggleTheme}
        role="switch"
        type="button"
      >
        <span className="theme-switch-track">
          <span className="theme-switch-thumb" />
        </span>
      </button>
    </div>
  );
}
