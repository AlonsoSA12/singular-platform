import { generateAgileKeyResultDraft } from "../../../src/okrs/ai-drafts.js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = await generateAgileKeyResultDraft({
      existingKeyResults: Array.isArray(body?.existingKeyResults) ? body.existingKeyResults : [],
      idea: typeof body?.idea === "string" ? body.idea : "",
      objective: body?.objective ?? null,
      projectId: typeof body?.projectId === "string" ? body.projectId : "",
      projectName: typeof body?.projectName === "string" ? body.projectName : ""
    });

    return Response.json(payload);
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "No fue posible generar el Key Result con IA."
      },
      { status: 500 }
    );
  }
}
