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
      <button className="secondary-button" disabled={isPending} onClick={handleLogout} type="button">
        {isPending ? "Saliendo..." : "Cerrar sesion"}
      </button>
      {error ? <p className="mini-error">{error}</p> : null}
    </div>
  );
}
