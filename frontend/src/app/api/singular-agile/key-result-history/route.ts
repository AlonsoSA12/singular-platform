import { NextResponse } from "next/server";
import {
  updateSingularAgileKeyResultHistoryInBackend,
  type SingularAgileKeyResultHistoryUpdateInput
} from "@/lib/okrs";
import { readSession } from "@/lib/session";

function getWriteErrorStatus(message: string) {
  if (message.includes("obligatorio") || message.includes("valid") || message.includes("Debe")) return 400;
  if (message.includes("No autorizado")) return 403;
  return 502;
}

function sanitizeHistoryUpdate(body: SingularAgileKeyResultHistoryUpdateInput) {
  return {
    currentValue: body.currentValue,
    initialValue: body.initialValue,
    recordId: body.recordId,
    sourceId: body.sourceId ?? body.source_id,
    targetValue: body.targetValue
  } satisfies SingularAgileKeyResultHistoryUpdateInput;
}

export async function PATCH(request: Request) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as SingularAgileKeyResultHistoryUpdateInput;

    if (!body.recordId?.trim() && !body.sourceId?.trim() && !body.source_id?.trim()) {
      return NextResponse.json({ message: "El recordId o source_id es obligatorio." }, { status: 400 });
    }

    const payload = await updateSingularAgileKeyResultHistoryInBackend(sanitizeHistoryUpdate(body));

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible actualizar el histórico del Key Result en Singular Agile.";

    return NextResponse.json({ message }, { status: getWriteErrorStatus(message) });
  }
}
