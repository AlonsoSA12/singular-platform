import { NextResponse } from "next/server";
import { fetchTrustworthinessSuggestionFromBackend } from "@/lib/trustworthiness";
import { readSession } from "@/lib/session";

type RouteContext = {
  params: Promise<{
    recordId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const { recordId } = await context.params;
    const body = (await request.json()) as {
      end?: string;
      participantEmail?: string;
      start?: string;
    };
    const participantEmail = body.participantEmail?.trim().toLowerCase();
    const start = body.start?.trim();
    const end = body.end?.trim();

    if (!participantEmail) {
      return NextResponse.json({ message: "El email del talento es obligatorio." }, { status: 400 });
    }

    if (!start || !end) {
      return NextResponse.json(
        { message: "El rango total start/end es obligatorio." },
        { status: 400 }
      );
    }

    const payload = await fetchTrustworthinessSuggestionFromBackend(
      recordId,
      session.email,
      session.email,
      {
        end,
        participantEmail,
        start
      }
    );

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible generar la sugerencia TW.";

    return NextResponse.json({ message }, { status: 502 });
  }
}
