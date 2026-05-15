import { analyzeAgileKeyResultSentiments } from "../../src/okrs/ai-key-result-sentiment.js";

type KeyResultSentimentsBody = {
  keyResults?: Array<{
    code?: string;
    currentValue?: number | null;
    id?: string;
    initialValue?: number | null;
    metric?: string;
    progress?: number | null;
    status?: string;
    targetDate?: string;
    targetValue?: number | null;
    title?: string;
  }>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as KeyResultSentimentsBody;
    const keyResults = Array.isArray(body.keyResults) ? body.keyResults : [];

    if (keyResults.length === 0) {
      return Response.json(
        {
          ok: false,
          message: "La lista de Key Results es obligatoria."
        },
        { status: 400 }
      );
    }

    const payload = await analyzeAgileKeyResultSentiments(
      keyResults
        .filter((keyResult) => keyResult.id)
        .map((keyResult) => ({
          code: keyResult.code,
          currentValue: keyResult.currentValue,
          id: keyResult.id ?? "",
          initialValue: keyResult.initialValue,
          metric: keyResult.metric,
          progress: keyResult.progress,
          status: keyResult.status,
          targetDate: keyResult.targetDate,
          targetValue: keyResult.targetValue,
          title: keyResult.title ?? keyResult.id ?? "Key Result"
        }))
    );

    return Response.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible analizar Rose/Bud/Thorn para los Key Results.";

    return Response.json(
      {
        ok: false,
        message
      },
      { status: 500 }
    );
  }
}
