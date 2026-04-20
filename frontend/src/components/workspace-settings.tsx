"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getAppRoleOption } from "@/lib/roles";

type WorkspaceSettingsProps = {
  userInitial: string;
  userLabel: string;
  userRole: string;
  variant?: "sidebar" | "header";
};

export function WorkspaceSettings({
  userInitial,
  userLabel,
  userRole,
  variant = "sidebar"
}: WorkspaceSettingsProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const activeRole = getAppRoleOption(userRole);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const detailsElement = detailsRef.current;

      if (!detailsElement?.open) {
        return;
      }

      const target = event.target;

      if (target instanceof Node && !detailsElement.contains(target)) {
        detailsElement.open = false;
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const isHeaderVariant = variant === "header";
  const detailsClassName = isHeaderVariant ? "user-menu user-menu-header" : "user-menu";
  const triggerClassName =
    isHeaderVariant
      ? "workspace-profile workspace-profile-trigger"
      : "user-card user-menu-trigger";
  const menuClassName = isHeaderVariant ? "workspace-profile-menu" : "user-menu-modal";
  const avatarClassName =
    isHeaderVariant
      ? "workspace-profile-avatar user-avatar"
      : "user-avatar";
  const copyClassName =
    isHeaderVariant
      ? "workspace-profile-copy user-card-copy"
      : "user-card-copy";

  return (
    <details className={detailsClassName} ref={detailsRef}>
      <summary className={triggerClassName}>
        <span
          aria-label={`Rol activo: ${activeRole.label}`}
          className="user-role-indicator"
          style={{ "--user-role-color": activeRole.color } as CSSProperties}
        />
        <div className={avatarClassName}>{userInitial}</div>
        <div className={copyClassName}>
          <p className="user-name">{userLabel}</p>
          <p className="user-email">{activeRole.label}</p>
        </div>
        <span aria-hidden="true" className="user-menu-chevron">
          ⌄
        </span>
      </summary>

      <div className={menuClassName}>
        {!isHeaderVariant ? (
          <div className="user-menu-modal-header">
            <div className="user-menu-modal-identity">
              <span
                aria-label={`Rol activo: ${activeRole.label}`}
                className="user-role-indicator is-compact"
                style={{ "--user-role-color": activeRole.color } as CSSProperties}
              />
              <span aria-hidden="true" className="user-menu-modal-avatar">
                {userInitial}
              </span>
              <div className="user-menu-modal-copy">
                <strong>{userLabel}</strong>
                <span>{activeRole.label}</span>
              </div>
            </div>
          </div>
        ) : null}
        <div className="user-menu-actions">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </details>
  );
}
