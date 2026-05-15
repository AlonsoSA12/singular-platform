import { getOptionalBackendProtectionBypassSecret } from "@/lib/env";

export async function fetchFromBackend(input: string | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const bypassSecret = getOptionalBackendProtectionBypassSecret();

  if (bypassSecret) {
    headers.set("x-vercel-protection-bypass", bypassSecret);
  }

  return fetch(input, {
    ...init,
    headers
  });
}
