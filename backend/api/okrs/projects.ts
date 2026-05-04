import { listAgileProjectsForCollaborator } from "../../src/airtable.js";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const collaboratorEmail = searchParams.get("collaboratorEmail")?.trim().toLowerCase();

    if (!collaboratorEmail) {
      return Response.json(
        {
          ok: false,
          message: "El email del collaborator es obligatorio."
        },
        { status: 400 }
      );
    }

    const payload = await listAgileProjectsForCollaborator(collaboratorEmail);

    return Response.json({
      ok: true,
      ...payload
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No fue posible consultar los proyectos de OKRs.";

    return Response.json(
      {
        ok: false,
        message
      },
      { status: 500 }
    );
  }
}
