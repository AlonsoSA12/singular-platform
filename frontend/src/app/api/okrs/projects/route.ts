import { NextResponse } from "next/server";
import { fetchAgileProjectsFromBackend } from "@/lib/okrs";
import { readSession } from "@/lib/session";

const projectsCache = new Map<
  string,
  {
    expiresAt: number;
    promise?: ReturnType<typeof fetchAgileProjectsFromBackend>;
    payload?: Awaited<ReturnType<typeof fetchAgileProjectsFromBackend>>;
  }
>();
const projectsCacheTtlMs = 30_000;

export async function GET() {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const cacheKey = session.email.trim().toLowerCase();
  const cachedEntry = projectsCache.get(cacheKey);
  const now = Date.now();

  if (cachedEntry && cachedEntry.expiresAt > now) {
    if (cachedEntry.payload) {
      return NextResponse.json(cachedEntry.payload);
    }

    if (cachedEntry.promise) {
      const payload = await cachedEntry.promise;
      return NextResponse.json(payload);
    }
  }

  try {
    const promise = fetchAgileProjectsFromBackend(session.email);
    projectsCache.set(cacheKey, {
      expiresAt: now + projectsCacheTtlMs,
      promise
    });

    const payload = await promise;

    projectsCache.set(cacheKey, {
      expiresAt: Date.now() + projectsCacheTtlMs,
      payload
    });

    return NextResponse.json(payload);
  } catch (error) {
    projectsCache.delete(cacheKey);

    const message =
      error instanceof Error
        ? error.message
        : "No fue posible consultar los proyectos de OKRs.";

    return NextResponse.json({ message }, { status: 502 });
  }
}
