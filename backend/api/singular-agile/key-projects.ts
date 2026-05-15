import {
  createSingularAgileKeyProject,
  listSingularAgileKeyProjectsByIds,
  updateSingularAgileKeyProject
} from "../../src/singular-agile/key-projects.js";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const recordIds = searchParams
      .get("recordIds")
      ?.split(",")
      .map((recordId) => recordId.trim())
      .filter(Boolean) ?? [];
    const payload = await listSingularAgileKeyProjectsByIds(recordIds);

    return Response.json(payload, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No fue posible consultar los Key Projects en Singular Agile.";

    return Response.json(
      {
        ok: false,
        message
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = await createSingularAgileKeyProject(body);

    return Response.json(payload, {
      status: payload.created ? 201 : payload.status === "validation_failed" ? 400 : 500
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No fue posible procesar el JSON del Key Project.";

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
    const recordId = typeof body?.recordId === "string" ? body.recordId : undefined;
    const { recordId: _recordId, ...fields } = typeof body === "object" && body !== null ? body : {};
    const payload = await updateSingularAgileKeyProject(recordId, fields);

    return Response.json(payload, {
      status: payload.updated ? 200 : payload.status === "validation_failed" ? 400 : 500
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No fue posible procesar el JSON del Key Project.";

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
