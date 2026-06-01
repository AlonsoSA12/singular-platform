import { generateAgileObjectiveDraft } from "../../../src/okrs/ai-drafts.js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = await generateAgileObjectiveDraft({
      existingObjectives: Array.isArray(body?.existingObjectives) ? body.existingObjectives : [],
      idea: typeof body?.idea === "string" ? body.idea : "",
      keyProjects: Array.isArray(body?.keyProjects) ? body.keyProjects : [],
      projectId: typeof body?.projectId === "string" ? body.projectId : "",
      projectName: typeof body?.projectName === "string" ? body.projectName : ""
    });

    return Response.json(payload);
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "No fue posible generar el Objective con IA."
      },
      { status: 500 }
    );
  }
}
