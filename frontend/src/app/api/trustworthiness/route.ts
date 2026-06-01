import { NextResponse } from "next/server";
import { fetchTrustworthinessFromBackend } from "@/lib/trustworthiness";
import { readSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const selectedPeriods = searchParams.getAll("period");
    const payload = await fetchTrustworthinessFromBackend(selectedPeriods, session.email);

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible consultar la tabla de Trustworthiness.";

    return NextResponse.json({ message }, { status: 502 });
  }
}
