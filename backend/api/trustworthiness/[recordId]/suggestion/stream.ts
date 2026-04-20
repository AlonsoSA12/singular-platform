import { createTrustworthinessSuggestion } from "../../../../src/airtable.js";
import {
  getNormalizedEmailParam,
  getPathSegmentFromEnd,
  trustworthinessSuggestionStageLabels,
  trustworthinessTextEncoder,
  type SuggestionBody,
  type TrustworthinessSuggestionStage
} from "../../../../src/trustworthiness-api.js";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const evaluatorEmail = getNormalizedEmailParam(searchParams, "evaluatorEmail");
  const activeEmail = getNormalizedEmailParam(searchParams, "activeEmail");
  const body = (await request.json()) as SuggestionBody;
  const participantEmail = body.participantEmail?.trim().toLowerCase();
  const start = body.start?.trim();
  const end = body.end?.trim();
  let currentStage: TrustworthinessSuggestionStage | null = "validating_evaluation_data";

  const stream = new ReadableStream({
    start: async (controller) => {
      const writeEvent = (event: Record<string, unknown>) => {
        controller.enqueue(trustworthinessTextEncoder.encode(`${JSON.stringify(event)}\n`));
      };

      const writeStage = (stage: TrustworthinessSuggestionStage) => {
        currentStage = stage;
        writeEvent({
          label: trustworthinessSuggestionStageLabels[stage],
          stage,
          type: "stage"
        });
      };

      try {
        writeStage("validating_evaluation_data");

        if (!evaluatorEmail) {
          throw new Error("El email del evaluator es obligatorio.");
        }

        if (!participantEmail) {
          throw new Error("El email del talento es obligatorio.");
        }

        if (!start || !end) {
          throw new Error("El rango total start/end es obligatorio.");
        }

        const recordId = getPathSegmentFromEnd(request, 2);
        const suggestion = await createTrustworthinessSuggestion(
          recordId,
          participantEmail,
          activeEmail,
          { end, start },
          writeStage
        );

        writeEvent({
          data: {
            ok: true,
            evaluatorEmail,
            ...suggestion
          },
          type: "result"
        });
      } catch (error) {
        writeEvent({
          message:
            error instanceof Error
              ? error.message
              : "No fue posible generar la sugerencia TW.",
          stage: currentStage,
          type: "error"
        });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no"
    },
    status: 200
  });
}
