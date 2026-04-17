import { NextResponse } from "next/server";
import { generateTrustworthinessFeedbackInBackend } from "@/lib/trustworthiness";
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
      evaluatedName?: string;
      existingFeedback?: string | null;
      pillars?: Record<
        "reliability" | "intimacy" | "groupThinking" | "credibility",
        {
          aiSuggestion?: unknown;
          meaning?: string;
          points?: number;
        }
      >;
      projectContext?: string | null;
      roleLabel?: string | null;
    };

    if (!body.evaluatedName?.trim()) {
      return NextResponse.json(
        { message: "El nombre del talento es obligatorio para generar feedback." },
        { status: 400 }
      );
    }

    if (!body.pillars) {
      return NextResponse.json(
        { message: "Los pilares son obligatorios para generar feedback." },
        { status: 400 }
      );
    }

    const feedback = await generateTrustworthinessFeedbackInBackend(recordId, session.email, {
      evaluatedName: body.evaluatedName.trim(),
      existingFeedback: body.existingFeedback ?? null,
      pillars: {
        credibility: {
          aiSuggestion: body.pillars.credibility?.aiSuggestion,
          meaning: body.pillars.credibility?.meaning ?? "",
          points: body.pillars.credibility?.points ?? 0
        },
        groupThinking: {
          aiSuggestion: body.pillars.groupThinking?.aiSuggestion,
          meaning: body.pillars.groupThinking?.meaning ?? "",
          points: body.pillars.groupThinking?.points ?? 0
        },
        intimacy: {
          aiSuggestion: body.pillars.intimacy?.aiSuggestion,
          meaning: body.pillars.intimacy?.meaning ?? "",
          points: body.pillars.intimacy?.points ?? 0
        },
        reliability: {
          aiSuggestion: body.pillars.reliability?.aiSuggestion,
          meaning: body.pillars.reliability?.meaning ?? "",
          points: body.pillars.reliability?.points ?? 0
        }
      },
      projectContext: body.projectContext ?? null,
      roleLabel: body.roleLabel ?? null
    });

    return NextResponse.json({
      feedback,
      ok: true
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible generar el feedback con IA.";

    return NextResponse.json({ message }, { status: 502 });
  }
}
