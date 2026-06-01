import { analyzeAgileObjectiveHealth } from "../../src/okrs/ai-objective-health.js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const objectives = Array.isArray(body?.objectives) ? body.objectives : [];

    if (objectives.length === 0) {
      return Response.json(
        {
          ok: false,
          message: "La lista de Objectives es obligatoria."
        },
        { status: 400 }
      );
    }

    const payload = await analyzeAgileObjectiveHealth({
      keyProjects: Array.isArray(body?.keyProjects) ? body.keyProjects : [],
      objectives,
      project:
        body?.project && typeof body.project === "object"
          ? {
              id: typeof body.project.id === "string" ? body.project.id : "",
              name: typeof body.project.name === "string" ? body.project.name : ""
            }
          : undefined
    });

    return Response.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible analizar la salud de los Objectives.";

    return Response.json(
      {
        ok: false,
        message
      },
      { status: 500 }
    );
  }
}
