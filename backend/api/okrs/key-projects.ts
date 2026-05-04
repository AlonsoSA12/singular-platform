import { createAgileKeyProject, listAgileKeyProjectsForProject } from "../../src/airtable.js";

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

    const payload = await listAgileKeyProjectsForProject(projectId);

    return Response.json({
      ok: true,
      ...payload
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No fue posible consultar los Key Projects de OKRs.";

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
      dontShowInSingularStories?: boolean;
      epicStory?: string;
      justification?: string;
      name?: string;
      projectId?: string;
      status?: "Active" | "Archived" | "Suggested by Resource";
      totalStories?: number | null;
    };
    const payload = await createAgileKeyProject({
      dontShowInSingularStories: body.dontShowInSingularStories,
      epicStory: body.epicStory,
      justification: body.justification,
      name: body.name ?? "",
      projectId: body.projectId ?? "",
      status: body.status,
      totalStories: body.totalStories
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
      error instanceof Error ? error.message : "No fue posible crear el Key Project de OKRs.";

    return Response.json(
      {
        ok: false,
        message
      },
      { status: message.includes("obligatorio") ? 400 : 500 }
    );
  }
}
