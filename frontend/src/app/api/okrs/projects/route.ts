import { NextResponse } from "next/server";
import { fetchAgileProjectsFromBackend } from "@/lib/okrs";
import { readSession } from "@/lib/session";

export async function GET() {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const payload = await fetchAgileProjectsFromBackend(session.email);

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible consultar los proyectos de OKRs.";

    return NextResponse.json({ message }, { status: 502 });
  }
}
