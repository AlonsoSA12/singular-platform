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
      credibilityAiJson?: string | null;
      feedback?: string;
      groupThinkingPoints?: number | null;
      groupThinkingAiJson?: string | null;
      intimacyPoints?: number | null;
      intimacyAiJson?: string | null;
      ratingStatus?: "Pending" | "Done";
      reliabilityPoints?: number | null;
      reliabilityAiJson?: string | null;
    };
    const { recordId } = await context.params;
    const payload = {
      ...(Object.prototype.hasOwnProperty.call(body, "credibilityPoints")
        ? { credibilityPoints: body.credibilityPoints ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "credibilityAiJson")
        ? { credibilityAiJson: body.credibilityAiJson ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "feedback")
        ? { feedback: body.feedback ?? "" }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "groupThinkingPoints")
        ? { groupThinkingPoints: body.groupThinkingPoints ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "groupThinkingAiJson")
        ? { groupThinkingAiJson: body.groupThinkingAiJson ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "intimacyPoints")
        ? { intimacyPoints: body.intimacyPoints ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "intimacyAiJson")
        ? { intimacyAiJson: body.intimacyAiJson ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "ratingStatus")
        ? { ratingStatus: body.ratingStatus }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "reliabilityPoints")
        ? { reliabilityPoints: body.reliabilityPoints ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "reliabilityAiJson")
        ? { reliabilityAiJson: body.reliabilityAiJson ?? null }
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
