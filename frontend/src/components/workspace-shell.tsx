"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  DEFAULT_WORKSPACE_MODULE,
  getWorkspaceModuleFromPathname,
  WORKSPACE_LAST_VIEW_COOKIE,
  WORKSPACE_MODULES
} from "@/lib/workspace-navigation";

type WorkspaceShellProps = {
  children: React.ReactNode;
  userInitial: string;
};

type RailIconName = "bot" | "okrs" | "portfolio" | "tw";

function RailIcon({ name }: { name: RailIconName }) {
  if (name === "tw") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 3.5 18.5 6v5.2c0 4.1-2.6 7.7-6.5 9.3-3.9-1.6-6.5-5.2-6.5-9.3V6L12 3.5Z" />
        <path d="m8.9 12.1 2 2 4.2-4.4" />
        <path d="M8.4 7.9h.01" />
        <path d="M15.6 7.9h.01" />
      </svg>
    );
  }

  if (name === "okrs") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="7.5" />
        <circle cx="12" cy="12" r="3.8" />
        <path d="M12 2.5v3" />
        <path d="M12 18.5v3" />
        <path d="M2.5 12h3" />
        <path d="M18.5 12h3" />
      </svg>
    );
  }

  if (name === "bot") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect x="5" y="7.5" width="14" height="11" rx="3" />
        <path d="M12 7.5V4.5" />
        <path d="M9.5 4.5h5" />
        <path d="M8.8 12h.01" />
        <path d="M15.2 12h.01" />
        <path d="M9.5 15h5" />
      </svg>
    );
  }

  if (name === "portfolio") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 19.5V4.5" />
        <path d="M4 19.5h16" />
        <path d="M7.5 15.5 11 12l2.7 2.7L18.5 8" />
        <path d="M15.5 8h3v3" />
      </svg>
    );
  }

  return null;
}

export function WorkspaceShell({ children }: WorkspaceShellProps) {
  const pathname = usePathname();
  const activeModule =
    getWorkspaceModuleFromPathname(pathname ?? "") ?? DEFAULT_WORKSPACE_MODULE;

  useEffect(() => {
    document.cookie = `${WORKSPACE_LAST_VIEW_COOKIE}=${activeModule}; path=/; max-age=31536000; samesite=lax`;
  }, [activeModule]);

  return (
    <main className="workspace-shell">
      <aside className="workspace-rail" aria-label="Primary">
        <div className="workspace-rail-brand">
          <Link
            aria-label="Go to workspace"
            className="workspace-rail-logo-link"
            href="/workspace"
          >
            <img
              alt="Singular Stories"
              className="workspace-rail-logo-image"
              height="28"
              src="/images/symbol-dark.png"
              width="28"
            />
          </Link>
        </div>

        <nav aria-label="Workspace navigation" className="workspace-rail-nav">
          {WORKSPACE_MODULES.map((module) => {
            const isActive = module.id === activeModule;
            const iconName: RailIconName =
              module.id === "okrs"
                ? "okrs"
                : module.id === "okr-bot"
                  ? "bot"
                  : module.id === "portfolio-analysis"
                    ? "portfolio"
                    : "tw";

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`workspace-rail-link${isActive ? " is-active" : ""}`}
                href={module.href}
                key={module.id}
                title={module.title}
              >
                <span className="workspace-rail-link-icon" aria-hidden="true">
                  <RailIcon name={iconName} />
                </span>
                <span className="workspace-rail-link-label">{module.label}</span>
              </Link>
            );
          })}
        </nav>

      </aside>

      {children}
    </main>
  );
}
