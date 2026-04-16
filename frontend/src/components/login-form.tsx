"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Ingresa un email para continuar.");
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ email: normalizedEmail })
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "No fue posible iniciar sesion.");
        return;
      }

      startTransition(() => {
        router.push("/workspace");
        router.refresh();
      });
    } catch {
      setError("No se pudo conectar con el servicio de autenticacion.");
    }
  }

  return (
    <form className="login-panel" onSubmit={handleSubmit}>
      <div className="login-badge">Singular Platform</div>
      <div className="login-copy">
        <p className="eyebrow">Access Gate</p>
        <h1>Trustworthiness starts with a controlled entry point.</h1>
        <p>
          Esta demo valida el email contra Airtable desde el backend y abre un espacio
          inicial de trabajo para el usuario autorizado.
        </p>
      </div>

      <label className="field">
        <span>Email</span>
        <input
          autoComplete="email"
          className="field-input"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@email.com"
          type="email"
          value={email}
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <button className="primary-button" disabled={isPending} type="submit">
        {isPending ? "Validando..." : "Ingresar"}
      </button>
    </form>
  );
}
