import { NextResponse } from "next/server";
import { analyzeAgileObjectiveHealthInBackend } from "@/lib/okrs";
import { readSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const objectives = Array.isArray(body?.objectives) ? body.objectives : [];

    if (objectives.length === 0) {
      return NextResponse.json({ message: "La lista de Objectives es obligatoria." }, { status: 400 });
    }

    const payload = await analyzeAgileObjectiveHealthInBackend({
      keyProjects: Array.isArray(body?.keyProjects) ? body.keyProjects : [],
      objectives,
      project:
        body?.project && typeof body.project === "object"
          ? {
              id: typeof body.project.id === "string" ? body.project.id : "",
              name: typeof body.project.name === "string" ? body.project.name : ""
            }
          : {
              id: "",
              name: ""
            }
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "No fue posible analizar la salud de los Objectives." },
      { status: 502 }
    );
  }
}
