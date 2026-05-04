import { createAgileObjective, listAgileObjectivesForProject } from "../../src/airtable.js";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId")?.trim();

    if (!projectId) {
      return Response.json(
        {
          ok: false,
          message: "El projectId es obligatorio."
        },
        { status: 400 }
      );
    }

    const payload = await listAgileObjectivesForProject(projectId);

    return Response.json({
      ok: true,
      ...payload
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No fue posible consultar los objetivos de OKRs.";

    return Response.json(
      {
        ok: false,
        message
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      aiSuggestedKeyResults?: string;
      description?: string;
      explanation?: string;
      metric?: string;
      objective?: string;
      priority?: string;
      projectId?: string;
      quarter?: string;
      status?: "Achieved" | "In Progress" | "Pending Review" | "Underachieved";
      targetDate?: string;
      type?: string;
    };
    const payload = await createAgileObjective({
      aiSuggestedKeyResults: body.aiSuggestedKeyResults,
      description: body.description,
      explanation: body.explanation,
      metric: body.metric,
      objective: body.objective ?? "",
      priority: body.priority,
      projectId: body.projectId ?? "",
      quarter: body.quarter,
      status: body.status,
      targetDate: body.targetDate,
      type: body.type
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
      error instanceof Error ? error.message : "No fue posible crear el Objective de OKRs.";

    return Response.json(
      {
        ok: false,
        message
      },
      { status: message.includes("obligatorio") ? 400 : 500 }
    );
  }
}
