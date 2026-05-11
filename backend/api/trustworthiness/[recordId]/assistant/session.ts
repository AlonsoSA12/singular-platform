import { createTrustworthinessAssistantSession } from "../../../../src/trustworthiness/assistant-session.js";
import {
  badRequestResponse,
  getNormalizedEmailParam,
  getPathSegmentFromEnd,
  trustworthinessErrorResponse,
  type AssistantSessionBody
} from "../../../../src/trustworthiness-api.js";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const evaluatorEmail = getNormalizedEmailParam(searchParams, "evaluatorEmail");
    const activeEmail = getNormalizedEmailParam(searchParams, "activeEmail");
    const body = (await request.json()) as AssistantSessionBody;
    const participantEmail = body.participantEmail?.trim().toLowerCase();
    const evaluatedName = body.evaluatedName?.trim();
    const start = body.start?.trim();
    const end = body.end?.trim();

    if (!evaluatorEmail) {
      return badRequestResponse("El email del evaluator es obligatorio.");
    }

    if (!participantEmail) {
      return badRequestResponse("El email del talento es obligatorio.");
    }

    if (!evaluatedName) {
      return badRequestResponse("El nombre del talento es obligatorio.");
    }

    if (!start || !end) {
      return badRequestResponse("El rango total start/end es obligatorio.");
    }
    const recordId = getPathSegmentFromEnd(request, 2);
    const payload = await createTrustworthinessAssistantSession({
      activeSessionEmail: activeEmail,
      end,
      evaluatedName,
      evaluatorEmail,
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
      recordId,
      roleLabel: body.roleLabel ?? null,
      start,
      suggestion: body.suggestion
    });

    return Response.json({
      ok: true,
      ...payload
    });
  } catch (error) {
    return trustworthinessErrorResponse(error, "No fue posible preparar el asistente de TW.");
  }
}
