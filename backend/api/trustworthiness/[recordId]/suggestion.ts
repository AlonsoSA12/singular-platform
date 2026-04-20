import { createTrustworthinessSuggestion } from "../../../src/airtable.js";
import {
  badRequestResponse,
  getNormalizedEmailParam,
  getPathSegmentFromEnd,
  trustworthinessErrorResponse,
  type SuggestionBody
} from "../../../src/trustworthiness-api.js";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const evaluatorEmail = getNormalizedEmailParam(searchParams, "evaluatorEmail");
    const activeEmail = getNormalizedEmailParam(searchParams, "activeEmail");
    const body = (await request.json()) as SuggestionBody;
    const participantEmail = body.participantEmail?.trim().toLowerCase();
    const start = body.start?.trim();
    const end = body.end?.trim();

    if (!evaluatorEmail) {
      return badRequestResponse("El email del evaluator es obligatorio.");
    }

    if (!participantEmail) {
      return badRequestResponse("El email del talento es obligatorio.");
    }

    if (!start || !end) {
      return badRequestResponse("El rango total start/end es obligatorio.");
    }
    const recordId = getPathSegmentFromEnd(request, 1);
    const suggestion = await createTrustworthinessSuggestion(
      recordId,
      participantEmail,
      activeEmail,
      { end, start }
    );

    return Response.json({
      ok: true,
      evaluatorEmail,
      ...suggestion
    });
  } catch (error) {
    return trustworthinessErrorResponse(error, "No fue posible generar la sugerencia TW.");
  }
}
