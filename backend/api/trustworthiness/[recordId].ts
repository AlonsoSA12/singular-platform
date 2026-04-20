import { updateTrustworthinessRecord } from "../../src/airtable.js";
import {
  badRequestResponse,
  getNormalizedEmailParam,
  getPathSegmentFromEnd,
  trustworthinessErrorResponse,
  type UpdateTrustworthinessBody
} from "../../src/trustworthiness-api.js";

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const evaluatorEmail = getNormalizedEmailParam(searchParams, "evaluatorEmail");

  if (!evaluatorEmail) {
    return badRequestResponse("El email del evaluator es obligatorio.");
  }

  try {
    const recordId = getPathSegmentFromEnd(request, 0);
    const body = (await request.json()) as UpdateTrustworthinessBody;
    const record = await updateTrustworthinessRecord(recordId, evaluatorEmail, {
      ...(Object.prototype.hasOwnProperty.call(body, "credibilityPoints")
        ? { "Credibility Points": body.credibilityPoints ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "credibilityAiJson")
        ? { "Credibility AI JSON": body.credibilityAiJson ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "feedback")
        ? { Feedback: body.feedback ?? "" }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "groupThinkingPoints")
        ? { "Group Thinking Points": body.groupThinkingPoints ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "groupThinkingAiJson")
        ? { "Group Thinking Points AI JSON": body.groupThinkingAiJson ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "intimacyPoints")
        ? { "Intimacy Points": body.intimacyPoints ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "intimacyAiJson")
        ? { "Intimacy AI JSON": body.intimacyAiJson ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "ratingStatus")
        ? { "Rating Status": body.ratingStatus }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "reliabilityPoints")
        ? { "Reliability Points": body.reliabilityPoints ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "reliabilityAiJson")
        ? { "Reliability AI JSON": body.reliabilityAiJson ?? null }
        : {})
    });

    return Response.json({
      ok: true,
      record
    });
  } catch (error) {
    return trustworthinessErrorResponse(error, "No fue posible actualizar la evaluación.");
  }
}
