import { listTrustworthinessRecords } from "../src/airtable.js";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedPeriods = searchParams.getAll("period");
    const evaluatorEmail = searchParams.get("evaluatorEmail")?.trim().toLowerCase();

    if (!evaluatorEmail) {
      return Response.json(
        {
          ok: false,
          message: "El email del evaluator es obligatorio."
        },
        { status: 400 }
      );
    }

    const payload = await listTrustworthinessRecords(selectedPeriods, evaluatorEmail);

    return Response.json({
      ok: true,
      ...payload
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible consultar la tabla de Trustworthiness.";

    return Response.json(
      {
        ok: false,
        message
      },
      { status: 500 }
    );
  }
}
