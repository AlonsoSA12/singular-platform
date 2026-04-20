import { saveTrustworthinessAssistantProposal } from "../../../../src/airtable.js";
import {
  badRequestResponse,
  getNormalizedEmailParam,
  getPathSegmentFromEnd,
  trustworthinessErrorResponse,
  type AssistantSaveBody
} from "../../../../src/trustworthiness-api.js";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const evaluatorEmail = getNormalizedEmailParam(searchParams, "evaluatorEmail");
    const body = (await request.json()) as AssistantSaveBody;

    if (!evaluatorEmail) {
      return badRequestResponse("El email del evaluator es obligatorio.");
    }
    const recordId = getPathSegmentFromEnd(request, 2);
    const record = await saveTrustworthinessAssistantProposal(recordId, evaluatorEmail, {
      agentId: body.agentId,
      agentVersion: body.agentVersion,
      confirmedByUser: body.confirmedByUser,
      context: body.context,
      proposal: body.proposal
        ? {
            credibilityPoints: body.proposal.credibilityPoints ?? 0,
            feedback: body.proposal.feedback ?? "",
            groupThinkingPoints: body.proposal.groupThinkingPoints ?? 0,
            intimacyPoints: body.proposal.intimacyPoints ?? 0,
            reliabilityPoints: body.proposal.reliabilityPoints ?? 0
          }
        : undefined,
      ratingStatus: body.ratingStatus,
      twSuggestion: body.twSuggestion
    });

    return Response.json({
      ok: true,
      record
    });
  } catch (error) {
    return trustworthinessErrorResponse(error, "No fue posible guardar la propuesta de TW.");
  }
}
