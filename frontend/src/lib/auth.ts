import { getFrontendServerEnv } from "@/lib/env";
import type { AuthenticatedUser } from "@/lib/types";

type BackendAuthSuccess = {
  ok: true;
  user: AuthenticatedUser;
};

type BackendAuthFailure = {
  ok: false;
  message?: string;
};

export async function validateEmailAgainstBackend(email: string): Promise<AuthenticatedUser> {
  const { backendBaseUrl } = getFrontendServerEnv();

  const response = await fetch(`${backendBaseUrl}/auth/validate-email`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ email }),
    cache: "no-store"
  });

  const payload = (await response.json()) as BackendAuthSuccess | BackendAuthFailure;

  if (!response.ok || !payload.ok) {
    const message = "message" in payload ? payload.message : undefined;
    throw new Error(message ?? "No fue posible validar el email.");
  }

  return payload.user;
}
