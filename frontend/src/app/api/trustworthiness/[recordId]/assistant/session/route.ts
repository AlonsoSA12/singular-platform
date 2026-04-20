import { NextResponse } from "next/server";
import { startTrustworthinessAssistantSessionInBackend } from "@/lib/trustworthiness";
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
      evaluatedName?: string;
      existingFeedback?: string | null;
      participantEmail?: string;
      projectContext?: string | null;
      roleLabel?: string | null;
      start?: string;
    };
    const participantEmail = body.participantEmail?.trim().toLowerCase();
    const evaluatedName = body.evaluatedName?.trim();
    const start = body.start?.trim();
    const end = body.end?.trim();

    if (!participantEmail) {
      return NextResponse.json({ message: "El email del talento es obligatorio." }, { status: 400 });
    }

    if (!evaluatedName) {
      return NextResponse.json({ message: "El nombre del talento es obligatorio." }, { status: 400 });
    }

    if (!start || !end) {
      return NextResponse.json(
        { message: "El rango total start/end es obligatorio." },
        { status: 400 }
      );
    }

    const payload = await startTrustworthinessAssistantSessionInBackend(
      recordId,
      session.email,
      session.email,
      {
        end,
        evaluatedName,
        existingFeedback: body.existingFeedback ?? null,
        participantEmail,
        projectContext: body.projectContext ?? null,
        roleLabel: body.roleLabel ?? null,
        start
      }
    );

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible preparar el asistente de TW.";

    return NextResponse.json({ message }, { status: 502 });
  }
}
