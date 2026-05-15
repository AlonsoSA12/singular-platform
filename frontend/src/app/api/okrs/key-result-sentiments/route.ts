import { NextResponse } from "next/server";
import { analyzeAgileKeyResultSentimentsInBackend } from "@/lib/okrs";
import { readSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const keyResults = Array.isArray(body?.keyResults) ? body.keyResults : [];

    if (keyResults.length === 0) {
      return NextResponse.json({ message: "La lista de Key Results es obligatoria." }, { status: 400 });
    }

    const payload = await analyzeAgileKeyResultSentimentsInBackend(keyResults);

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible analizar Rose/Bud/Thorn para los Key Results.";

    return NextResponse.json({ message }, { status: 502 });
  }
}
