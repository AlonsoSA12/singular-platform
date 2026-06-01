import { NextResponse } from "next/server";
import { fetchCoachingContextFromBackend } from "@/lib/trustworthiness";
import { readSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const participantEmail = searchParams.get("participantEmail")?.trim().toLowerCase();
    const start = searchParams.get("start")?.trim();
    const end = searchParams.get("end")?.trim();

    if (!participantEmail) {
      return NextResponse.json({ message: "El email del talento es obligatorio." }, { status: 400 });
    }

    if (!start || !end) {
      return NextResponse.json(
        { message: "El rango total start/end es obligatorio." },
        { status: 400 }
      );
    }

    const payload = await fetchCoachingContextFromBackend(
      { end, start },
      participantEmail,
      session.email
    );

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible consultar el contexto de reuniones.";

    return NextResponse.json({ message }, { status: 502 });
  }
}
