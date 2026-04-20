import { createTrustworthinessAssistantReply } from "../../../../src/airtable.js";
import {
  badRequestResponse,
  trustworthinessErrorResponse,
  type AssistantMessageBody
} from "../../../../src/trustworthiness-api.js";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AssistantMessageBody;
    const prompt = body.prompt?.trim();
    const evaluatedName = body.evaluatedName?.trim();

    if (!prompt) {
      return badRequestResponse("El prompt del usuario es obligatorio.");
    }

    if (!evaluatedName) {
      return badRequestResponse("El nombre del talento es obligatorio.");
    }

    if (!body.proposal || !body.suggestion || !body.meetings) {
      return badRequestResponse("Falta contexto para continuar con el asistente.");
    }

    const assistantReply = await createTrustworthinessAssistantReply({
      evaluatedName,
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
              typeof meeting.coachingAnalysis === "string"
                ? meeting.coachingAnalysis
                : null,
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
            title:
              typeof meeting.title === "string" ? meeting.title : "Reunión sin título",
            topics: Array.isArray(meeting.topics) ? meeting.topics : [],
            transcriptSummary:
              typeof meeting.transcriptSummary === "string"
                ? meeting.transcriptSummary
                : null
          }))
        : [],
      projectContext: body.projectContext ?? null,
      prompt,
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

    return Response.json({
      ok: true,
      ...assistantReply
    });
  } catch (error) {
    return trustworthinessErrorResponse(error, "No fue posible continuar el asistente de TW.");
  }
}
