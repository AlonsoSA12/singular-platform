import { NextResponse } from "next/server";
import {
  createSingularAgileKeyProjectInBackend,
  fetchAgileProjectsFromBackend,
  updateSingularAgileKeyProjectInBackend,
  type SingularAgileKeyProjectInput,
  type SingularAgileKeyProjectUpdateInput
} from "@/lib/okrs";
import { readSession } from "@/lib/session";

function getWriteErrorStatus(message: string) {
  if (message.includes("obligatorio") || message.includes("valid") || message.includes("Debe")) return 400;
  if (message.includes("No autorizado")) return 403;
  return 502;
}

function getProjectIdFromBody(body: Partial<SingularAgileKeyProjectInput>) {
  return Array.isArray(body.projectIds) ? body.projectIds[0]?.trim() : undefined;
}

export async function POST(request: Request) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as SingularAgileKeyProjectInput;
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

    const payload = await createSingularAgileKeyProjectInBackend(body);

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible crear el Key Project en Singular Agile.";

    return NextResponse.json({ message }, { status: getWriteErrorStatus(message) });
  }
}

export async function PATCH(request: Request) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as SingularAgileKeyProjectUpdateInput;
    const projectId = getProjectIdFromBody(body);

    if (!body.recordId?.trim()) {
      return NextResponse.json({ message: "El recordId es obligatorio." }, { status: 400 });
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

    const payload = await updateSingularAgileKeyProjectInBackend(body);

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible actualizar el Key Project en Singular Agile.";

    return NextResponse.json({ message }, { status: getWriteErrorStatus(message) });
  }
}
