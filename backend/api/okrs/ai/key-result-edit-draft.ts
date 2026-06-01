import { generateAgileKeyResultEditDraft } from "../../../src/okrs/ai-drafts.js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = await generateAgileKeyResultEditDraft({
      currentKeyResult: body?.currentKeyResult ?? null,
      editInstructions: typeof body?.editInstructions === "string" ? body.editInstructions : "",
      keyResultHistory: Array.isArray(body?.keyResultHistory) ? body.keyResultHistory : [],
      objective: body?.objective ?? null,
      projectId: typeof body?.projectId === "string" ? body.projectId : "",
      projectName: typeof body?.projectName === "string" ? body.projectName : "",
      siblingKeyResults: Array.isArray(body?.siblingKeyResults) ? body.siblingKeyResults : []
    });

    return Response.json(payload);
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "No fue posible generar la edición de Key Result con IA."
      },
      { status: 500 }
    );
  }
}
