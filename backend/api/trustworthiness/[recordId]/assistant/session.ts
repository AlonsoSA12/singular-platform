import { createTrustworthinessAssistantSession } from "../../../../src/airtable.js";
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
      participantEmail,
      projectContext: body.projectContext ?? null,
      recordId,
      roleLabel: body.roleLabel ?? null,
      start
    });

    return Response.json({
      ok: true,
      ...payload
    });
  } catch (error) {
    return trustworthinessErrorResponse(error, "No fue posible preparar el asistente de TW.");
  }
}
