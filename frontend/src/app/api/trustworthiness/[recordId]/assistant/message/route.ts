import { NextResponse } from "next/server";
import { sendTrustworthinessAssistantMessageToBackend } from "@/lib/trustworthiness";
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
      history?: Array<{
        content?: string;
        role?: "assistant" | "user";
      }>;
      meetings?: Array<{
        actionItems?: string[];
        coachingAnalysis?: string | null;
        coachingSummary?: string | null;
        meetingDatetime?: string | null;
        meetingId?: string;
        metricsScores?: Record<string, number | null>;
        title?: string;
        topics?: string[];
        transcriptSummary?: string | null;
      }>;
      projectContext?: string | null;
      prompt?: string;
      proposal?: {
        credibilityPoints?: number;
        feedback?: string;
        groupThinkingPoints?: number;
        intimacyPoints?: number;
        reliabilityPoints?: number;
      };
      roleLabel?: string | null;
      suggestion?: Record<string, unknown>;
    };

    if (!body.prompt?.trim()) {
      return NextResponse.json({ message: "El prompt del usuario es obligatorio." }, { status: 400 });
    }

    if (!body.evaluatedName?.trim()) {
      return NextResponse.json({ message: "El nombre del talento es obligatorio." }, { status: 400 });
    }

    if (!body.proposal || !body.suggestion || !body.meetings) {
      return NextResponse.json(
        { message: "Falta contexto para continuar con el asistente." },
        { status: 400 }
      );
    }

    const payload = await sendTrustworthinessAssistantMessageToBackend(recordId, {
      evaluatedName: body.evaluatedName.trim(),
      history: Array.isArray(body.history)
        ? body.history
            .filter(
              (message): message is { content: string; role: "assistant" | "user" } =>
                (message.role === "assistant" || message.role === "user") &&
                typeof message.content === "string" &&
                message.content.trim().length > 0
            )
            .map((message) => ({
              content: message.content.trim(),
              role: message.role
            }))
        : [],
      meetings: Array.isArray(body.meetings)
        ? body.meetings.map((meeting) => ({
            actionItems: Array.isArray(meeting.actionItems) ? meeting.actionItems : [],
            coachingAnalysis:
              typeof meeting.coachingAnalysis === "string" ? meeting.coachingAnalysis : null,
            coachingSummary:
              typeof meeting.coachingSummary === "string" ? meeting.coachingSummary : null,
            meetingDatetime:
              typeof meeting.meetingDatetime === "string" ? meeting.meetingDatetime : null,
            meetingId:
              typeof meeting.meetingId === "string" ? meeting.meetingId : "unknown-meeting",
            metricsScores:
              meeting.metricsScores && typeof meeting.metricsScores === "object"
                ? meeting.metricsScores
                : {},
            title: typeof meeting.title === "string" ? meeting.title : "Reunión sin título",
            topics: Array.isArray(meeting.topics) ? meeting.topics : [],
            transcriptSummary:
              typeof meeting.transcriptSummary === "string" ? meeting.transcriptSummary : null
          }))
        : [],
      projectContext: body.projectContext ?? null,
      prompt: body.prompt.trim(),
      proposal: {
        credibilityPoints: body.proposal.credibilityPoints ?? 0,
        feedback: body.proposal.feedback ?? "",
        groupThinkingPoints: body.proposal.groupThinkingPoints ?? 0,
        intimacyPoints: body.proposal.intimacyPoints ?? 0,
        reliabilityPoints: body.proposal.reliabilityPoints ?? 0
      },
      roleLabel: body.roleLabel ?? null,
      suggestion: body.suggestion
    });

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible continuar la conversación del asistente.";

    return NextResponse.json({ message }, { status: 502 });
  }
}
