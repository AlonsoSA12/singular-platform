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
      participantEmail?: string;
      proposal?: {
        credibilityPoints?: number;
        feedback?: string;
        groupThinkingPoints?: number;
        intimacyPoints?: number;
        reliabilityPoints?: number;
      };
      projectContext?: string | null;
      roleLabel?: string | null;
      suggestion?: Record<string, unknown>;
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
          : undefined,
        participantEmail,
        proposal: body.proposal
          ? {
              credibilityPoints: body.proposal.credibilityPoints ?? 0,
              feedback: body.proposal.feedback ?? "",
              groupThinkingPoints: body.proposal.groupThinkingPoints ?? 0,
              intimacyPoints: body.proposal.intimacyPoints ?? 0,
              reliabilityPoints: body.proposal.reliabilityPoints ?? 0
            }
          : undefined,
        projectContext: body.projectContext ?? null,
        roleLabel: body.roleLabel ?? null,
        suggestion: body.suggestion,
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
