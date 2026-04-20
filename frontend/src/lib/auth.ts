import { getBackendBaseUrl } from "@/lib/env";
import { fetchFromBackend } from "@/lib/backend";
import type { AuthenticatedUser } from "@/lib/types";

type BackendAuthSuccess = {
  ok: true;
  authenticated: true;
  user: AuthenticatedUser;
};

type BackendAuthFailure = {
  ok: false;
  authenticated: false;
  message?: string;
};

export async function validateEmailAgainstBackend(email: string): Promise<AuthenticatedUser> {
  const backendBaseUrl = getBackendBaseUrl();

  const response = await fetchFromBackend(`${backendBaseUrl}/auth/validate-email`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ email }),
    cache: "no-store"
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      "El backend no devolvio JSON. Revisa BACKEND_BASE_URL o la proteccion del deployment."
    );
  }

  const payload = (await response.json()) as BackendAuthSuccess | BackendAuthFailure;

  if (!response.ok || !payload.ok) {
    const message = "message" in payload ? payload.message : undefined;
    throw new Error(message ?? "No fue posible validar el email.");
  }

  return payload.user;
}
