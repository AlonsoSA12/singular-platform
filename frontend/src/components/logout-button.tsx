"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleLogout() {
    setError(null);

    const response = await fetch("/api/auth/logout", {
      method: "POST"
    });

    if (!response.ok) {
      setError("No se pudo cerrar sesion.");
      return;
    }

    startTransition(() => {
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="logout-block">
      <button className="user-menu-action-button" disabled={isPending} onClick={handleLogout} type="button">
        <span aria-hidden="true" className="user-menu-action-icon">
          <svg viewBox="0 0 24 24">
            <path d="M13 4a1 1 0 1 1 2 0v6a1 1 0 1 1-2 0V4ZM8.1 6.5a1 1 0 0 1 1.4 1.43A6 6 0 1 0 14 6.1a1 1 0 1 1 .66-1.89A8 8 0 1 1 8.1 6.5Z" />
          </svg>
        </span>
        <span>{isPending ? "Saliendo..." : "Cerrar sesion"}</span>
      </button>
      {error ? <p className="mini-error">{error}</p> : null}
    </div>
  );
}
