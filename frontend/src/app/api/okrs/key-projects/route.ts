import { NextResponse } from "next/server";
import {
  createAgileKeyProjectInBackend,
  fetchAgileKeyProjectsFromBackend,
  fetchAgileProjectsFromBackend,
  type CreateAgileKeyProjectInput
} from "@/lib/okrs";
import { readSession } from "@/lib/session";

function getWriteErrorStatus(message: string) {
  if (message.includes("obligatorio")) return 400;
  if (message.includes("No autorizado")) return 403;
  return 502;
}

export async function GET(request: Request) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId")?.trim();

    if (!projectId) {
      return NextResponse.json({ message: "El projectId es obligatorio." }, { status: 400 });
    }

    const projectsPayload = await fetchAgileProjectsFromBackend(session.email);
    const canReadProject = projectsPayload.projects.some((project) => project.id === projectId);

    if (!canReadProject) {
      return NextResponse.json({ message: "No autorizado para consultar este proyecto." }, { status: 403 });
    }

    const payload = await fetchAgileKeyProjectsFromBackend(projectId);

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible consultar los Key Projects de OKRs.";

    return NextResponse.json({ message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CreateAgileKeyProjectInput;
    const projectId = body.projectId?.trim();

    if (!projectId) {
      return NextResponse.json({ message: "El projectId es obligatorio." }, { status: 400 });
    }

    const projectsPayload = await fetchAgileProjectsFromBackend(session.email);
    const canWriteProject = projectsPayload.projects.some((project) => project.id === projectId);

    if (!canWriteProject) {
      return NextResponse.json({ message: "No autorizado para crear en este proyecto." }, { status: 403 });
    }

    const payload = await createAgileKeyProjectInBackend({
      ...body,
      projectId
    });

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible crear el Key Project de OKRs.";

    return NextResponse.json({ message }, { status: getWriteErrorStatus(message) });
  }
}
