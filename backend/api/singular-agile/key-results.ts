import {
  createSingularAgileKeyResult,
  updateSingularAgileKeyResult
} from "../../src/singular-agile/key-results.js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = await createSingularAgileKeyResult(body);

    return Response.json(payload, {
      status: payload.created ? 201 : payload.status === "validation_failed" ? 400 : 500
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No fue posible procesar el JSON del Key Result.";

    return Response.json(
      {
        ok: false,
        status: "validation_failed",
        created: false,
        message
      },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { recordId, ...fields } = body;
    const payload = await updateSingularAgileKeyResult(recordId, fields);

    return Response.json(payload, {
      status: payload.updated ? 200 : payload.status === "validation_failed" ? 400 : 500
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No fue posible procesar el JSON del Key Result.";

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
