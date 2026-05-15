import { createAgileKeyResult, updateAgileKeyResult } from "../../src/okrs/airtable-key-results.js";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      currentValue?: number | null;
      explanation?: string;
      initialValue?: number | null;
      keyResult?: string;
      metric?: string;
      objectiveId?: string;
      projectId?: string;
      quarter?: string;
      status?: "Done" | "In progress" | "Todo";
      targetDate?: string;
      targetValue?: number | null;
    };
    const payload = await createAgileKeyResult({
      currentValue: body.currentValue,
      explanation: body.explanation,
      initialValue: body.initialValue,
      keyResult: body.keyResult ?? "",
      metric: body.metric,
      objectiveId: body.objectiveId ?? "",
      projectId: body.projectId ?? "",
      quarter: body.quarter,
      status: body.status,
      targetDate: body.targetDate,
      targetValue: body.targetValue
    });

    return Response.json(
      {
        ok: true,
        ...payload
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No fue posible crear el Key Result de OKRs.";

    return Response.json(
      {
        ok: false,
        message
      },
      { status: message.includes("obligatorio") ? 400 : 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      currentValue?: number | null;
      explanation?: string;
      initialValue?: number | null;
      keyResult?: string;
      metric?: string;
      objectiveId?: string;
      projectId?: string;
      quarter?: string;
      recordId?: string;
      status?: "Done" | "In progress" | "Todo";
      targetDate?: string;
      targetValue?: number | null;
    };
    const payload = await updateAgileKeyResult({
      currentValue: body.currentValue,
      explanation: body.explanation,
      initialValue: body.initialValue,
      keyResult: body.keyResult,
      metric: body.metric,
      objectiveId: body.objectiveId,
      projectId: body.projectId ?? "",
      quarter: body.quarter,
      recordId: body.recordId ?? "",
      status: body.status,
      targetDate: body.targetDate,
      targetValue: body.targetValue
    });

    return Response.json({
      ok: true,
      ...payload
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No fue posible actualizar el Key Result de OKRs.";

    return Response.json(
      {
        ok: false,
        message
      },
      { status: message.includes("obligatorio") ? 400 : 500 }
    );
  }
}
