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
    <form className="ss-login-card" onSubmit={handleSubmit}>
      <div className="ss-login-card-content">
        <div className="ss-login-card-copy">
          <h2>Sign in to your account</h2>
          <p>Great to see you again</p>
        </div>

        <div className="ss-login-form-fields">
          <label className="ss-login-field" htmlFor="email">
            <span>Email address</span>
            <input
              autoComplete="email"
              className="ss-login-input"
              id="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              type="email"
              value={email}
            />
          </label>

          {error ? <p className="ss-login-error">{error}</p> : null}

          <button className="ss-login-submit" disabled={isPending || !email.trim()} type="submit">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M7 10V8a5 5 0 0 1 10 0v2h.5A2.5 2.5 0 0 1 20 12.5v6A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-6A2.5 2.5 0 0 1 6.5 10H7Zm2 0h6V8a3 3 0 0 0-6 0v2Zm3 4a1.25 1.25 0 0 0-.75 2.25V18a.75.75 0 0 0 1.5 0v-1.75A1.25 1.25 0 0 0 12 14Z" />
            </svg>
            {isPending ? "Validando..." : "Next"}
          </button>
        </div>
      </div>
    </form>
  );
}
