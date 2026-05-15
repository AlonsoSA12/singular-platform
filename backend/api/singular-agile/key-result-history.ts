import { updateSingularAgileKeyResultHistory } from "../../src/singular-agile/key-result-history.js";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { recordId, ...fields } = body;
    const payload = await updateSingularAgileKeyResultHistory(recordId, fields);

    return Response.json(payload, {
      status: payload.updated ? 200 : payload.status === "validation_failed" ? 400 : 500
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No fue posible procesar el JSON del histórico del Key Result.";

    return Response.json(
      {
        ok: false,
        status: "validation_failed",
        updated: false,
        message
      },
      { status: 400 }
    );
  }
}
