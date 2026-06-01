import { generateAgileKeyProjectDraft } from "../../../src/okrs/ai-drafts.js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = await generateAgileKeyProjectDraft({
      existingKeyProjects: Array.isArray(body?.existingKeyProjects) ? body.existingKeyProjects : [],
      existingKeyResults: Array.isArray(body?.existingKeyResults) ? body.existingKeyResults : [],
      idea: typeof body?.idea === "string" ? body.idea : "",
      objectives: Array.isArray(body?.objectives) ? body.objectives : [],
      projectId: typeof body?.projectId === "string" ? body.projectId : "",
      projectName: typeof body?.projectName === "string" ? body.projectName : "",
      selectedKeyResult: body?.selectedKeyResult ?? null
    });

    return Response.json(payload);
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "No fue posible generar el Key Project con IA."
      },
      { status: 500 }
    );
  }
}
