import { listSingularAgileKeyResultHistoryBulk } from "../../../src/singular-agile/key-result-history.js";

type SingularAgileKeyResultHistoryBulkBody = {
  keyResultIds?: string[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SingularAgileKeyResultHistoryBulkBody;
    const keyResultIds = Array.isArray(body.keyResultIds) ? body.keyResultIds : [];

    if (keyResultIds.length === 0) {
      return Response.json(
        {
          ok: false,
          message: "La lista de Key Results es obligatoria."
        },
        { status: 400 }
      );
    }

    const payload = await listSingularAgileKeyResultHistoryBulk(keyResultIds);

    return Response.json({
      ok: true,
      ...payload
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible consultar el histórico de Key Results de Singular Agile.";

    return Response.json(
      {
        ok: false,
        message
      },
      { status: 500 }
    );
  }
}
