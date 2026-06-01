import { NextResponse } from "next/server";
import { fetchFromBackend } from "@/lib/backend";
import { getBackendBaseUrl } from "@/lib/env";
import { readSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
      prompt?: string;
      rehydrate?: {
        end?: string;
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
        participantEmail?: string;
        projectContext?: string | null;
        proposal?: {
          credibilityPoints?: number;
          feedback?: string;
          groupThinkingPoints?: number;
          intimacyPoints?: number;
          reliabilityPoints?: number;
        };
        roleLabel?: string | null;
        start?: string;
        suggestion?: Record<string, unknown>;
      };
      sessionId?: string;
    };
    const prompt = body.prompt?.trim();
    const sessionId = body.sessionId?.trim();
    const rehydrate =
      body.rehydrate &&
      typeof body.rehydrate === "object" &&
      typeof body.rehydrate.evaluatedName === "string" &&
      typeof body.rehydrate.participantEmail === "string" &&
      typeof body.rehydrate.start === "string" &&
      typeof body.rehydrate.end === "string" &&
      body.rehydrate.proposal &&
      body.rehydrate.suggestion
        ? {
            activeSessionEmail: session.email,
            end: body.rehydrate.end.trim(),
            evaluatedName: body.rehydrate.evaluatedName.trim(),
            evaluatorEmail: session.email,
            history: Array.isArray(body.rehydrate.history)
              ? body.rehydrate.history
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
            meetings: Array.isArray(body.rehydrate.meetings)
              ? body.rehydrate.meetings.map((meeting) => ({
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
                    typeof meeting.transcriptSummary === "string"
                      ? meeting.transcriptSummary
                      : null
                }))
              : undefined,
            participantEmail: body.rehydrate.participantEmail.trim().toLowerCase(),
            projectContext:
              typeof body.rehydrate.projectContext === "string"
                ? body.rehydrate.projectContext
                : null,
            proposal: {
              credibilityPoints: body.rehydrate.proposal.credibilityPoints ?? 0,
              feedback: body.rehydrate.proposal.feedback ?? "",
              groupThinkingPoints: body.rehydrate.proposal.groupThinkingPoints ?? 0,
              intimacyPoints: body.rehydrate.proposal.intimacyPoints ?? 0,
              reliabilityPoints: body.rehydrate.proposal.reliabilityPoints ?? 0
            },
            roleLabel:
              typeof body.rehydrate.roleLabel === "string" ? body.rehydrate.roleLabel : null,
            start: body.rehydrate.start.trim(),
            suggestion: body.rehydrate.suggestion
          }
        : undefined;

    if (!prompt) {
      return NextResponse.json({ message: "El prompt del usuario es obligatorio." }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ message: "El sessionId del agente es obligatorio." }, { status: 400 });
    }

    const backendBaseUrl = getBackendBaseUrl();
    const url = new URL(
      `${backendBaseUrl}/trustworthiness/${encodeURIComponent(recordId)}/assistant/message/stream`
    );
    const backendResponse = await fetchFromBackend(url, {
      body: JSON.stringify({
        prompt,
        rehydrate,
        sessionId
      }),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const contentType = backendResponse.headers.get("content-type") ?? "";

    if (!backendResponse.body || !contentType.includes("application/x-ndjson")) {
      const message = await backendResponse.text().catch(() => "");

      return NextResponse.json(
        {
          message:
            message.length > 0
              ? message
              : "El backend no devolvió un stream NDJSON para el agente de TW."
        },
        { status: backendResponse.status || 502 }
      );
    }

    return new Response(backendResponse.body, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "X-Accel-Buffering": "no"
      },
      status: backendResponse.status
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible continuar la conversación del agente.";

    return NextResponse.json({ message }, { status: 502 });
  }
}
