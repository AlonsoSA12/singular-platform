import { getCoachingInputLogTranscript } from "../../../../src/airtable.js";
import {
  badRequestResponse,
  getNormalizedEmailParam,
  getPathSegmentFromEnd,
  getTrimmedQueryParam,
  trustworthinessErrorResponse
} from "../../../../src/trustworthiness-api.js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const participantEmail = getNormalizedEmailParam(searchParams, "participantEmail");
    const activeEmail = getNormalizedEmailParam(searchParams, "activeEmail");
    const start = getTrimmedQueryParam(searchParams, "start");
    const end = getTrimmedQueryParam(searchParams, "end");

    if (!participantEmail) {
      return badRequestResponse("El email del talento es obligatorio.");
    }

    if (!start || !end) {
      return badRequestResponse("El rango total start/end es obligatorio.");
    }
    const recordId = getPathSegmentFromEnd(request, 1);
    const payload = await getCoachingInputLogTranscript(
      recordId,
      participantEmail,
      activeEmail,
      {
        end,
        start
      }
    );

    return Response.json({
      ok: true,
      ...payload
    });
  } catch (error) {
    return trustworthinessErrorResponse(
      error,
      "No fue posible consultar el contexto de reuniones."
    );
  }
}
