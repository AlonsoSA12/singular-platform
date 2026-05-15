import { NextResponse } from "next/server";
import {
  createSingularAgileKeyResultInBackend,
  fetchAgileProjectsFromBackend,
  updateSingularAgileKeyResultInBackend,
  type SingularAgileKeyResultInput,
  type SingularAgileKeyResultUpdateInput
} from "@/lib/okrs";
import { readSession } from "@/lib/session";

function getWriteErrorStatus(message: string) {
  if (message.includes("obligatorio") || message.includes("valid") || message.includes("Debe")) return 400;
  if (message.includes("No autorizado")) return 403;
  return 502;
}

function getProjectIdFromBody(body: Partial<SingularAgileKeyResultInput>) {
  return Array.isArray(body.projectIds) ? body.projectIds[0]?.trim() : undefined;
}

export async function POST(request: Request) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as SingularAgileKeyResultInput;
    const projectId = getProjectIdFromBody(body);

    if (!projectId) {
      return NextResponse.json({ message: "El projectId es obligatorio." }, { status: 400 });
    }

    const projectsPayload = await fetchAgileProjectsFromBackend(session.email);
    const canWriteProject = projectsPayload.projects.some(
      (project) => project.id === projectId || project.sourceRecordId === projectId
    );

    if (!canWriteProject) {
      return NextResponse.json({ message: "No autorizado para crear en este proyecto." }, { status: 403 });
    }

    const payload = await createSingularAgileKeyResultInBackend(body);

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible crear el Key Result en Singular Agile.";

    return NextResponse.json({ message }, { status: getWriteErrorStatus(message) });
  }
}

export async function PATCH(request: Request) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as SingularAgileKeyResultUpdateInput;
    const projectId = getProjectIdFromBody(body);

    if (!body.recordId?.trim() && !body.sourceId?.trim() && !body.source_id?.trim()) {
      return NextResponse.json({ message: "El recordId o source_id es obligatorio." }, { status: 400 });
    }

    if (projectId) {
      const projectsPayload = await fetchAgileProjectsFromBackend(session.email);
      const canWriteProject = projectsPayload.projects.some(
        (project) => project.id === projectId || project.sourceRecordId === projectId
      );

      if (!canWriteProject) {
        return NextResponse.json({ message: "No autorizado para editar este proyecto." }, { status: 403 });
      }
    }

    const payload = await updateSingularAgileKeyResultInBackend(body);

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible actualizar el Key Result en Singular Agile.";

    return NextResponse.json({ message }, { status: getWriteErrorStatus(message) });
  }
}
