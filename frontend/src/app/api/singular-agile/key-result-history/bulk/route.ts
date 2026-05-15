import { NextResponse } from "next/server";
import { fetchSingularAgileKeyResultHistoryBulkFromBackend } from "@/lib/okrs";
import { readSession } from "@/lib/session";

type KeyResultHistoryBulkBody = {
  keyResultIds?: string[];
};

export async function POST(request: Request) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as KeyResultHistoryBulkBody;
    const keyResultIds = Array.isArray(body.keyResultIds)
      ? body.keyResultIds.map((keyResultId) => keyResultId.trim()).filter(Boolean)
      : [];

    if (keyResultIds.length === 0) {
      return NextResponse.json({ message: "La lista de Key Results es obligatoria." }, { status: 400 });
    }

    const payload = await fetchSingularAgileKeyResultHistoryBulkFromBackend(keyResultIds);

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible consultar el histórico de Key Results en Singular Agile.";

    return NextResponse.json({ message }, { status: 502 });
  }
}
