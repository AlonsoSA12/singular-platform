import { createTrustworthinessFeedback } from "../../../src/airtable.js";
import {
  badRequestResponse,
  getNormalizedEmailParam,
  getPathSegmentFromEnd,
  trustworthinessErrorResponse,
  type FeedbackSuggestionBody
} from "../../../src/trustworthiness-api.js";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const evaluatorEmail = getNormalizedEmailParam(searchParams, "evaluatorEmail");
    const body = (await request.json()) as FeedbackSuggestionBody;

    if (!evaluatorEmail) {
      return badRequestResponse("El email del evaluator es obligatorio.");
    }

    if (!body.evaluatedName?.trim()) {
      return badRequestResponse(
        "El nombre del talento es obligatorio para generar feedback."
      );
    }

    if (!body.pillars) {
      return badRequestResponse("Los pilares son obligatorios para generar feedback.");
    }
    const recordId = getPathSegmentFromEnd(request, 1);
    const feedback = await createTrustworthinessFeedback(recordId, evaluatorEmail, {
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

    return Response.json({
      feedback,
      ok: true
    });
  } catch (error) {
    return trustworthinessErrorResponse(error, "No fue posible generar el feedback con IA.");
  }
}
