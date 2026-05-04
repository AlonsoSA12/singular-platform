import { NextResponse } from "next/server";
import {
  createAgileKeyResultInBackend,
  fetchAgileObjectivesFromBackend,
  fetchAgileProjectsFromBackend,
  type CreateAgileKeyResultInput
} from "@/lib/okrs";
import { readSession } from "@/lib/session";

function getWriteErrorStatus(message: string) {
  if (message.includes("obligatorio")) return 400;
  if (message.includes("No autorizado")) return 403;
  if (message.includes("no pertenece") || message.includes("No se encontró")) return 404;
  return 502;
}

export async function POST(request: Request) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CreateAgileKeyResultInput;
    const projectId = body.projectId?.trim();
    const objectiveId = body.objectiveId?.trim();

    if (!projectId) {
      return NextResponse.json({ message: "El projectId es obligatorio." }, { status: 400 });
    }

    if (!objectiveId) {
      return NextResponse.json({ message: "El objectiveId es obligatorio." }, { status: 400 });
    }

    const projectsPayload = await fetchAgileProjectsFromBackend(session.email);
    const canWriteProject = projectsPayload.projects.some((project) => project.id === projectId);

    if (!canWriteProject) {
      return NextResponse.json({ message: "No autorizado para crear en este proyecto." }, { status: 403 });
    }

    const objectivesPayload = await fetchAgileObjectivesFromBackend(projectId);
    const canWriteObjective = objectivesPayload.objectives.some((objective) => objective.id === objectiveId);

    if (!canWriteObjective) {
      return NextResponse.json(
        { message: "No autorizado para crear Key Results en este Objective." },
        { status: 403 }
      );
    }

    const payload = await createAgileKeyResultInBackend({
      ...body,
      objectiveId,
      projectId
    });

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible crear el Key Result de OKRs.";

    return NextResponse.json({ message }, { status: getWriteErrorStatus(message) });
  }
}
