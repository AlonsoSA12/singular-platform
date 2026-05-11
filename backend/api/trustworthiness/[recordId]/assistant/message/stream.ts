import { streamTrustworthinessAssistantMessage } from "../../../../../src/trustworthiness/assistant-reply.js";
import {
  badRequestResponse,
  trustworthinessErrorResponse,
  type AssistantStreamMessageBody
} from "../../../../../src/trustworthiness-api.js";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AssistantStreamMessageBody;
    const prompt = body.prompt?.trim();
    const sessionId = body.sessionId?.trim();
    const rehydrate =
      body.rehydrate &&
      typeof body.rehydrate === "object" &&
      typeof body.rehydrate.evaluatedName === "string" &&
      typeof body.rehydrate.evaluatorEmail === "string" &&
      typeof body.rehydrate.participantEmail === "string" &&
      typeof body.rehydrate.start === "string" &&
      typeof body.rehydrate.end === "string" &&
      body.rehydrate.proposal &&
      body.rehydrate.suggestion
        ? {
            activeSessionEmail:
              typeof body.rehydrate.activeSessionEmail === "string"
                ? body.rehydrate.activeSessionEmail
                : undefined,
            end: body.rehydrate.end.trim(),
            evaluatedName: body.rehydrate.evaluatedName.trim(),
            evaluatorEmail: body.rehydrate.evaluatorEmail.trim().toLowerCase(),
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
      return badRequestResponse("El prompt del usuario es obligatorio.");
    }

    if (!sessionId) {
      return badRequestResponse("El sessionId del agente es obligatorio.");
    }

    const segments = new URL(request.url).pathname.split("/").filter(Boolean);
    const recordId = segments.at(-4) ?? "";
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const writeEvent = (event: unknown) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };

        try {
          await streamTrustworthinessAssistantMessage({
            emit: writeEvent,
            prompt,
            rehydrateSession: rehydrate,
            recordId,
            sessionId
          });
        } catch (error) {
          writeEvent({
            message:
              error instanceof Error
                ? error.message
                : "No fue posible continuar la conversación del agente.",
            type: "error"
          });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "Content-Type": "application/x-ndjson; charset=utf-8"
      }
    });
  } catch (error) {
    return trustworthinessErrorResponse(error, "No fue posible continuar el agente de TW.");
  }
}
