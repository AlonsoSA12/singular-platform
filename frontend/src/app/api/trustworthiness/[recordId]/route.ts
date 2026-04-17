import { NextResponse } from "next/server";
import { updateTrustworthinessRecordInBackend } from "@/lib/trustworthiness";
import { readSession } from "@/lib/session";

type RouteContext = {
  params: Promise<{
    recordId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      credibilityPoints?: number | null;
      feedback?: string;
      groupThinkingPoints?: number | null;
      intimacyPoints?: number | null;
      reliabilityPoints?: number | null;
    };
    const { recordId } = await context.params;
    const payload = {
      ...(Object.prototype.hasOwnProperty.call(body, "credibilityPoints")
        ? { credibilityPoints: body.credibilityPoints ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "feedback")
        ? { feedback: body.feedback ?? "" }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "groupThinkingPoints")
        ? { groupThinkingPoints: body.groupThinkingPoints ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "intimacyPoints")
        ? { intimacyPoints: body.intimacyPoints ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "reliabilityPoints")
        ? { reliabilityPoints: body.reliabilityPoints ?? null }
        : {})
    };
    const record = await updateTrustworthinessRecordInBackend(recordId, session.email, payload);

    return NextResponse.json({
      ok: true,
      record
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible actualizar la evaluación.";

    return NextResponse.json({ message }, { status: 502 });
  }
}
